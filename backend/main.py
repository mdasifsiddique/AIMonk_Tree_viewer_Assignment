from contextlib import asynccontextmanager 
from datetime import datetime 
import os 
import sys 
from dotenv import load_dotenv
from bson import ObjectId 
from fastapi import FastAPI, status , HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from motor.motor_asyncio import AsyncIOMotorClient 
from pydantic import BaseModel
import uvicorn 
from typing import List, Optional , Dict
import uuid
from dal import TreeDAL, Node

load_dotenv()
COLLECTION_NAME = "tree_nodes" 

MONGODB_URI = os.getenv("MONGODB_URI")
print("MongoDB URI loaded successfully:", MONGODB_URI)
DEBUG = os.environ.get("DEBUG", "").strip().lower() in {"1", "true", "on", "yes"} 

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup:
    client = AsyncIOMotorClient(MONGODB_URI) 
    database = client.get_default_database() 
    # Ensure the database is available:
    pong = await database.command("ping")
    if int(pong["ok"]) != 1:
        raise Exception("Cluster connection is not okay!")

    nodes_collection  = database.get_collection(COLLECTION_NAME) 
 
    app._nodes_collection = TreeDAL(nodes_collection)
   
    yield

    # Shutdown:
    client.close()


app = FastAPI(lifespan=lifespan, debug=DEBUG)

# Serve the React build folder
# Paths for the frontend dist folder
frontend_folder = os.path.join(os.getcwd(), "..", "frontend")
dist_folder = os.path.join(frontend_folder, "dist")


# all classes
class CreateRootNodeRequest(BaseModel):
    id: str
    name: str
    data: Optional[str] = None

class RootNodeCreatedResponse(BaseModel):
    message: str
    node: Dict[str, Optional[str]]  # Since the node will have the fields like 'id', 'name', 'parentId', etc.

class AddNodeRequest(BaseModel):
    id: str
    parentId: str #Optional[str]
    name: str
    data: str #Optional[str] = None

class UpdateNodeRequest(BaseModel):
    id: str
    name: str #Optional[str] = None
    parentId:str # Optional[str] = None
    data: Optional[str] = None

class PutRequestAddUpdateOperation(BaseModel):
    add: List[AddNodeRequest]
    update: List[UpdateNodeRequest]



@app.get("/api")
async def read_api():
    return {"message": "API is working"}


@app.get("/api/getTreeData")
async def getTreeData():
    try:
        # Save the node using the Data Access Layer (DAL)
        tree_data = await app._nodes_collection.get_tree_data()
        
        return {"message": "tree_data successfully", "tree_data": tree_data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


#first call
@app.post("/api/add_root")
async def add_root_node(request : CreateRootNodeRequest ) -> RootNodeCreatedResponse :
    try:
        # Create the root node
        node = Node(
            id=request.id,
            name=request.name,
            data=request.data,
            parentId=None  # Root node doesn't have a parent
        )
        
        # Save the node using the Data Access Layer (DAL)
        created_node = await app._nodes_collection.create_root_node(node)
        
        return {"message": "Root node created successfully", "node": created_node}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

#second APi call for add and update operation
@app.put("/api/add_update_operations")
async def process_add_update_operations(operations: PutRequestAddUpdateOperation):
    try:
        # Bulk process "add" operations
        if operations.add:
            add_nodes = [
                {"_id": node.id, "id" : node.id,  "parentId": node.parentId, "name": node.name, "data": node.data}
                for node in operations.add
            ]
            await app._nodes_collection.bulk_insert_nodes(add_nodes)

        # Bulk process "update" operations
        if operations.update:
            update_nodes = [
                {"_id": node.id, "id" : node.id , "name": node.name, "data": node.data}
                for node in operations.update
            ]

            await app._nodes_collection.bulk_update_nodes(update_nodes)

        return {"message": "Add and update operations processed successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


#third APi call
class DeleteNodeRequest(BaseModel):
    id: str

@app.post("/api/delete_nodes")
async def delete_nodes(payload: List[DeleteNodeRequest]):
    """
    Deletes nodes and all their descendants based on the provided payload.
    """
    try:
        # Extract the IDs from the payload
        node_ids = [node.id for node in payload]

        # Call the Data Access Layer (DAL) method to delete nodes
        deleted_count = await app._nodes_collection.delete_multiple_nodes(node_ids)

        return {"message": f"Deleted {deleted_count} nodes successfully."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during deletion: {str(e)}")
    


# Serve the static files from the "dist" folder (like Express.js `app.use(express.static)`):
app.mount("/", StaticFiles(directory=dist_folder, html=True), name="static")

# Fallback to serve index.html for any unmatched routes
@app.get("/{path_name:path}")
async def serve_index_html():
    return FileResponse(os.path.join(dist_folder, "index.html"))

def main(argv=sys.argv[1:]):
    try:
        uvicorn.run("main:app", host="0.0.0.0", port=3001, reload=DEBUG)
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()