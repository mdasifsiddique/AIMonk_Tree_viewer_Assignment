from bson import ObjectId 
from motor.motor_asyncio import AsyncIOMotorCollection 
from pymongo import UpdateOne  
from pymongo import DeleteOne
from typing import List, Optional , Dict
from pymongo import ReturnDocument 
from pydantic import BaseModel, Field 
from uuid import uuid4 

class Node(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))  # Unique ID for the node
    name: str  # Name of the node
    parentId: Optional[str] = None  # Parent ID, optional as the root node won't have a parent
    data: Optional[str] = None  # Data is a string or None (empty for root nodes with children)

    class Config:
    # This is required to handle recursive types within the children list
        arbitrary_types_allowed = True



class TreeDAL:
  def __init__(self, nodes_collection: AsyncIOMotorCollection):
      self._nodes_collection = nodes_collection

  async def create_root_node(self, node: Node):
        # Convert the node into a dictionary and insert it into MongoDB
        node_dict = node.model_dump() #node.dict()
        node_dict['_id'] = node.id  # Use the provided id for the document's _id
        await self._nodes_collection.insert_one(node_dict)
        return node_dict
  
  async def bulk_insert_nodes(self, nodes: List[Dict]):
        """
        Inserts multiple nodes into the database in a single operation.
        """
        if nodes:
            try:
                # Bulk insert for performance
                await self._nodes_collection.insert_many(nodes, ordered=False)
            except Exception as e:
                raise RuntimeError(f"Error during bulk insert: {str(e)}")
            
  async def bulk_update_nodes(self, nodes: List[Dict]):
        """
        Updates multiple nodes in the database using bulk write operations.
        """
        if nodes:
            try:
                update_operations = []
                for node in nodes:
                    # Define the update query and set fields
                    update_query = {"_id": node["_id"]}
                    update_fields = {"$set": {}, "$unset": {}}

               
                    for key, value in node.items():
                        if key != "_id":
                            if value is not None:
                                # If the value is not None, use $set
                                update_fields["$set"][key] = value
                            else:
                                # If the value is None, use $unset to remove the field
                                update_fields["$unset"][key] = ""

                    update_operations.append(UpdateOne(update_query, update_fields))

                if update_operations:
                    # Execute bulk write operation
                    result = await self._nodes_collection.bulk_write(update_operations, ordered=False)

                    return result.modified_count  # Returns the number of documents modifie

            except Exception as e:
                raise RuntimeError(f"Error during bulk update: {str(e)}")

  async def delete_multiple_nodes(self, parent_ids: List[str]) -> int:
        """
        Deletes multiple parent nodes and all their descendants recursively.
        """
        try:
            delete_operations = [
                DeleteOne({"_id": node_id}) for node_id in parent_ids
            ]
            if delete_operations:
                result = await self._nodes_collection.bulk_write(delete_operations, ordered=False)

                return result.deleted_count
            return 0

        except Exception as e:
            raise RuntimeError(f"Error during recursive deletion: {str(e)}")



  async def get_tree_data(self) -> List[Dict]:
    """
    Fetches all nodes from the collection and returns them in a tree structure.
    """
    try:
        # Step 1: Fetch all nodes (without filtering by parentId)
        all_nodes = await self._nodes_collection.find().to_list(None)

        # Step 2: Create a dictionary to store nodes by their _id
        nodes_dict = {str(node["_id"]): node for node in all_nodes}

        # Step 3: Initialize a list to store root nodes (parentId is null)
        tree_data = []

        # Step 4: Create a mapping of parentId -> children nodes
        children_map = {}

        # Step 5: Construct the tree structure
        for node in all_nodes:
            node_copy = self._build_tree(node)  # Prepare the node for tree format
            parent_id = str(node.get("parentId"))
            if parent_id == "null" or parent_id is None or parent_id == "None":  # If it's a root node
                tree_data.append(node_copy)
            else:
                # Add this node to its parent's children list
                if parent_id not in children_map:
                    children_map[parent_id] = []
                children_map[parent_id].append(node_copy)

        # Step 6: Attach children to their respective parents
        for node in tree_data:
            self._attach_children(node, children_map)

        return tree_data

    except Exception as e:
        raise RuntimeError(f"Error fetching tree data: {str(e)}")

  def _build_tree(self, node: Dict) -> Dict:
    """
    Helper function to build the tree structure for each node.
    """
    node_copy = node.copy()
    node_copy.pop("parentId", None)  # We don't need to include parentId in the tree data
    node_copy.pop("_id", None)  # We don't need to include _id in the tree data

    if not node.get('data') :
        node_copy["children"] = []  # Initialize children as an empty list
    
    return node_copy

  def _attach_children(self, node: Dict, children_map: Dict):
    """
    Attach children to the current node from the children_map.
    """
    if "id" in node:
        node_id = str(node["id"])
        if node_id in children_map:
            node["children"] = children_map[node_id]
            for child in node["children"]:
                self._attach_children(child, children_map)



