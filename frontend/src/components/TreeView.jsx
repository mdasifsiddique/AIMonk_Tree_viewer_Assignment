import React from "react";
import { useEffect, useState } from "react";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import TagView from "./TagView";
import { toast } from "react-toastify";
import { ALL_URLs, BASE_URL } from "../utils/URLs";

const TreeView = () => {
  const [treeData, setTreeData] = useState([]);
  const [exportedData, setExportedData] = useState(null);
  const [isBeautify, setIsBeautify] = useState(false);

  const [allOperationDetails, setAllOperationDetails] = useState({
    add: [],
    update: [],
    delete: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const collectIds = (node) => {
    let ids = [node.id]; // Start with the root node's id
    if (node.children && node.children.length > 0) {
      // Recursively find ids in the children
      node.children.forEach((child) => {
        ids = ids.concat(collectIds(child)); // Merge child ids into the result
      });
    }
    return ids;
  };

  const addChild = (parentNode, parentLevelNodeId) => {
    // const newChild = { id: Date.now(), name: "New Child", data: "Data" };
    const newChild = { id: uuidv4(), name: "New Child", data: "Data" };

    const updatedTree = [...treeData];
    const updateNode = (node) => {
      if (node.id === parentNode.id) {
        if (!node.children) {
          node.children = [];
        }
        node.children.push(newChild);
        // node.data = "";
        delete node.data;

        // Check if this node's add operation already exists
        setAllOperationDetails((prevState) => {
          const addExists = prevState.add.some(
            (child) => child.id === newChild.id
          );
          if (!addExists) {
            return {
              ...prevState,
              add: [
                ...prevState.add,
                {
                  id: newChild.id,
                  parentId: parentNode.id,
                  name: newChild.name,
                  data: newChild.data,
                },
              ],
              //[...prevState.add, newChild], // Add only if not already added
            };
          }
          return prevState;
        });

        // also check in the update of "data" , as we know when we do addChild , the data key will be gone
        setAllOperationDetails((prevState) => {
          const nodeExists = prevState.update.some(
            (child) => child.id === node.id
          );
          if (nodeExists) {
            return {
              ...prevState,
              update: prevState.update.map((item) => {
                if (item.id == node.id) {
                  const newNodeInfo = { ...item };
                  delete newNodeInfo.data;
                  return newNodeInfo;
                }
                return item;
              }),
            };
          } else {
            return {
              ...prevState,
              update: [
                ...prevState.update,
                {
                  id: node.id,
                  name: node.name,
                  parentId: parentLevelNodeId,
                },
              ],
            };
          }
        });
      } else {
        node?.children?.forEach(updateNode);
      }
    };
    updatedTree.forEach(updateNode);
    setTreeData(updatedTree);
  };

  const deleteChild = (parentNodeId, childNodeId) => {
    let updatedTree = [...treeData];
    const updateNode = (node) => {
      if (node.id === parentNodeId) {
        const focusedChildNodeDetails = node?.children.find(
          (item) => item.id == childNodeId
        );
        node.children = node?.children?.filter(
          (child) => child.id !== childNodeId
        );
        //1st => delete this focused childNodeID
        // A. Check if this node is already in the delete operation
        setAllOperationDetails((prevState) => {
          const allIds = collectIds(focusedChildNodeDetails);
          const allDeleteIds = allIds
            .map((item) => {
              if (!prevState.delete.some((child) => child.id === item)) {
                return {
                  id: item,
                };
              }
            })
            .filter((item) => item);
          if (allDeleteIds && allDeleteIds.length > 0) {
            return {
              ...prevState,
              delete: [...prevState.delete, ...allDeleteIds], // Add delete operation if not already present
            };
          }
          return prevState;
        });
        //B. 1=> as this node is deleted , make sure all the corresponding operations in "add" and "update" is also removed
        setAllOperationDetails((prevState) => {
          const addExists = prevState.add.some(
            (child) => child.id === childNodeId
          );
          if (addExists) {
            return {
              ...prevState,
              add: prevState.add.filter((item) => item.id !== childNodeId),
            };
          }
          return prevState;
        });
        //B . 2=>  also check in the update of "data" , as we know when we do addChild , the data key will be gone
        setAllOperationDetails((prevState) => {
          const nodeExists = prevState.update.some(
            (child) => child.id === childNodeId
          );
          if (nodeExists) {
            return {
              ...prevState,
              update: prevState.update.filter(
                (item) => item.id !== childNodeId
              ),
            };
          }
          return prevState;
        });

        if (node?.children?.length == 0) {
          node.data = "Data";
          delete node.children;

          //on PARENT LEVEL NODE => add here the "data" key , which means we have to do the "update" key change
          setAllOperationDetails((prevState) => {
            const nodeExists = prevState.update.some(
              (child) => child.id === parentNodeId
            );
            if (nodeExists) {
              return {
                ...prevState,
                update: prevState.update.map((item) => {
                  if (item.id == parentNodeId) {
                    const newNodeInfo = { ...item };
                    if (newNodeInfo.hasOwnProperty("children")) {
                      delete item.children;
                    }
                    newNodeInfo.data = "Data";
                    return newNodeInfo;
                  }
                  return item;
                }),
              };
            } else {
              //just push new thing
              return {
                ...prevState,
                update: [
                  ...prevState.update,
                  {
                    id: node.id,
                    name: node.name,
                    data: "Data",
                    parentId: parentNodeId,
                  },
                ],
              };
            }
          });
        }
      } else {
        node?.children?.forEach(updateNode);
      }
    };
    if (parentNodeId === childNodeId) {
      //if both are same , then we have to delete the root elements
      const focusedChildNodeDetails = updatedTree.find(
        (item) => item.id == parentNodeId
      );
      updatedTree = updatedTree.filter((node) => node.id !== parentNodeId);

      // for root level node , we will not have the parentID , as it will be null
      // Check if this node is already in the delete operation
      setAllOperationDetails((prevState) => {
        const allIds = collectIds(focusedChildNodeDetails);
        const allDeleteIds = allIds
          .map((item) => {
            if (!prevState.delete.some((child) => child.id === item)) {
              return {
                id: item,
              };
            }
          })
          .filter((item) => item);
        if (allDeleteIds && allDeleteIds.length > 0) {
          return {
            ...prevState,
            delete: [...prevState.delete, ...allDeleteIds], // Add delete operation if not already present
          };
        }

        // const deleteExists = prevState.delete.some(
        //   (child) => child.id === parentNodeId
        // );
        // if (!deleteExists) {
        //   return {
        //     ...prevState,
        //     delete: [...prevState.delete, { id: parentNodeId }], // Add delete operation if not already present
        //   };
        // }
        return prevState;
      });

      //B. 1=> as this node is deleted , make sure all the corresponding operations in "add" and "update" is also removed
      setAllOperationDetails((prevState) => {
        const addExists = prevState.add.some(
          (child) => child.parentId === parentNodeId
        );
        if (addExists) {
          return {
            ...prevState,
            add: prevState.add.filter((item) => item.parentId !== parentNodeId),
          };
        }
        return prevState;
      });
      //B . 2=>  also check in the update of "data" , as we know when we do addChild , the data key will be gone
      setAllOperationDetails((prevState) => {
        const nodeExists = prevState.update.some(
          (child) => child.parentId === parentNodeId
        );
        if (nodeExists) {
          return {
            ...prevState,
            update: prevState.update.filter(
              (item) => item.parentId !== parentNodeId
            ),
          };
        }
        return prevState;
      });
    } else {
      updatedTree.forEach(updateNode);
    }
    setTreeData(updatedTree);
  };

  const onNodeNameChange = (parentNode, value, parentLevelNodeId) => {
    const updatedTree = [...treeData];
    const updateNode = (node) => {
      if (node.id === parentNode.id) {
        node.name = value;

        // Check if this node's update operation already exists
        setAllOperationDetails((prevState) => {
          const updateExists = prevState.update.some(
            // (operation) => operation.id === parentNode.id && operation.name === value
            (operation) => operation.id === parentNode.id
          );
          if (!updateExists) {
            //if it is not present , then push this
            const pushData = {
              id: node.id,
              name: value,
              parentId: parentLevelNodeId,
            };
            if (node.hasOwnProperty("data")) {
              pushData.data = node.data;
            }
            return {
              ...prevState,
              update: [
                ...prevState.update,
                pushData, // Add update operation if not already present
              ],
            };
          } else {
            //it is  present , so in this case , just update the
            return {
              ...prevState,
              update: prevState.update.map((item) => {
                if (item.id == node.id) {
                  return {
                    ...item,
                    name: node.name,
                  };
                }
                return item;
              }),
            };
          }
          // return prevState;
        });
      } else {
        node?.children?.forEach(updateNode);
      }
    };
    updatedTree.forEach(updateNode);
    setTreeData(updatedTree);
  };

  const onNodeDataChange = (parentNode, value, parentLevelNodeId) => {
    const updatedTree = [...treeData];
    const updateNode = (node) => {
      if (node.id === parentNode.id) {
        node.data = value;

        // Check if this node's update operation already exists
        setAllOperationDetails((prevState) => {
          const updateExists = prevState.update.some(
            // (operation) => operation.id === parentNode.id && operation.name === value
            (operation) => operation.id === parentNode.id
          );
          if (!updateExists) {
            //if it is not present , then push this
            const pushData = {
              id: node.id,
              name: node.name,
              parentId: parentLevelNodeId,
              data: value,
            };
            // if(node.hasOwnProperty('data')){
            //   pushData.data = value;
            // }
            return {
              ...prevState,
              update: [
                ...prevState.update,
                pushData, // Add update operation if not already present
              ],
            };
          } else {
            //it is  present , so in this case , just update the
            return {
              ...prevState,
              update: prevState.update.map((item) => {
                if (item.id == node.id) {
                  return {
                    ...item,
                    data: value,
                  };
                }
                return item;
              }),
            };
          }
          // return prevState;
        });
      } else {
        node?.children?.forEach(updateNode);
      }
    };
    updatedTree.forEach(updateNode);
    setTreeData(updatedTree);
  };

  const formatCompactJson = (data) => {
    return JSON.stringify(data)
      .replace(/,(?=\S)/g, " , ") // Adds a space after commas
      .replace(/:/g, " : ") // Adds a space after colons
      .replace(/{/g, " { ") // Adds a space after opening curly braces
      .replace(/}/g, " } ") // Adds a space before closing curly braces
      .replace(/\[/g, " [ ") // Adds a space after opening square brackets
      .replace(/\]/g, " ] "); // Adds a space before closing square brackets
  };

  const removeIdFromObject = (obj) => {
    // Remove "id" from the object and also recursively from nested objects
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (key === "id") {
          delete obj[key]; // Remove the "id" key
        } else if (typeof obj[key] === "object" && obj[key] !== null) {
          removeIdFromObject(obj[key]); // Recursively remove "id" from nested objects
        }
      }
    }
  };

  const handleRemoveIdFromObject = (treeArray) => {
    let copyTreeArray = JSON.parse(JSON.stringify(treeArray));
    copyTreeArray.forEach((item) => removeIdFromObject(item));
    return copyTreeArray;
  };

  const handlePostAddRootNodeAPI = async (newRoot) => {
    //make the API post call to backend
    try {
      setLoading(true);
      // setError("");
      // Axios POST request
      const url = BASE_URL + ALL_URLs.ADD_ROOT_NODE;
      const response = await axios.post(url, newRoot, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response?.status !== 200) {
        throw new Error("Error While Adding the root level node");
      }

      setError("");
      // Show a success toast
      toast.success("successfully added the root");
    } catch (err) {
      setError(err.message); // Handle error
      toast.error("Error While Adding the root level node");
      console.error("error in fetchAllRootNodes", err);
    } finally {
      setLoading(false); // Set loading state to false
    }
  };

  const fetchAllRootNodes = async () => {
    try {
      //loader on
      setLoading(true);
      // setError("");
      const url = BASE_URL + ALL_URLs.GET_ALL_ROOT_TREES;
      const response = await axios.get(url);
      if (response?.status !== 200) {
        throw new Error("Error while fetching the all root nodes");
      }

      if (response?.data?.tree_data) {
        setTreeData(response?.data?.tree_data);
      }
      // Show a success toast
      toast.success("Data fetched all root nodes successfully!");
      setError("");
    } catch (err) {
      setError(err.message); // Handle error
      toast.error("Error while fetching the all root nodes");
      console.error("error in fetchAllRootNodes", err);
    } finally {
      setLoading(false); // Set loading state to false
    }
  };

  const handleAddUpdateOperation = async () => {
    try {
      //loader on
      setLoading(true);
      // setError("");
      const url = BASE_URL + ALL_URLs.ADD_UPDATE_OPERATION;
      const response = await axios.put(
        url,
        {
          add: allOperationDetails.add,
          update: allOperationDetails.update,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response?.status !== 200) {
        throw new Error("Error while doing add/delete operation on the nodes");
      }

      // Show a success toast
      toast.success("successfully exported the nodes data");
      setError("");
      await handleDeleteNodesOperation();
    } catch (err) {
      setError(err.message); // Handle error
      console.error("Error in handleAddUpdateOperation", err);
      toast.error("Error while doing add/update operation on the nodes");
    } finally {
      setLoading(false); // Set loading state to false
    }
  };
  const handleDeleteNodesOperation = async () => {
    try {
      const deleteResponse = await axios.post(
        BASE_URL + ALL_URLs.DELETE_NODE_OPERATION,
        [...allOperationDetails.delete],
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (deleteResponse?.status !== 200) {
        throw new Error("Error while doing delete operation on the nodes");
      }
      setError("");
      // Show a success toast
      // toast.success("Data deleted successfully!");
    } catch (err) {
      setError(err.message); // Handle error
      console.error("Error in handleDeleteNodesOperation", err);
      toast.error("Error while doing delete operation on the nodes");
    } finally {
      setLoading(false); // Set loading state to false
    }
  };

  const handleExportOperation = async () => {
    try {
      setExportedData(JSON.parse(JSON.stringify(treeData)));

      await handleAddUpdateOperation();
      setAllOperationDetails({
        add: [],
        update: [],
        delete: [],
      });
    } catch (err) {
      setError(err.message); // Handle error
      console.log("Error in handleExportOperation", err);
      toast.error("Error while doing export operation");
    } finally {
      setLoading(false); // Set loading state to false
    }
  };

  const addRootNode = async () => {
    const newRoot = { id: uuidv4(), name: "New Root", data: "Data" };
    const updatedTree = [...treeData];
    updatedTree.push(newRoot);
    setTreeData(updatedTree);

    await handlePostAddRootNodeAPI(newRoot);
  };

  useEffect(() => {
    fetchAllRootNodes();
    return () => {};
  }, []);

  return (
    <div>
      <div className="overflow-auto border border-gray-300 p-4 bg-white rounded shadow">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold">Tree Viewer</h1>
          <button
            disabled={loading}
            className={`px-4 py-2 bg-blue-500 text-white rounded ${
              loading ? "" : "hover:bg-blue-600"
            } `}
            onClick={() => {
              addRootNode();
            }}
          >
            {/* Add Tree */}
            Add New Root
          </button>
        </div>
        {!error ? (
          <>
            {/* <div className="max-h-[80vh] overflow-auto whitespace-nowrap"> */}
            <div className="max-h-[49vh] overflow-auto whitespace-nowrap p-4 rounded shadow !border-black">
              {treeData.map((rootNode) => (
                <TagView
                  key={rootNode.id}
                  node={rootNode}
                  parentNodeId={rootNode.id}
                  onAddChild={addChild}
                  onDeleteChild={deleteChild}
                  onNodeNameChange={onNodeNameChange}
                  onNodeDataChange={onNodeDataChange}
                  loading={loading}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            <div>{error}</div>
          </>
        )}

        {/* export and JSON viewer */}

        <div className="p-4 bg-gray-100 rounded shadow  !border-black">
          <div className="flex justify-start mb-4">
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={handleExportOperation}
            >
              Export
            </button>
          </div>
          <div className="space-y-4">
            {/* Beautify JSON Checkbox */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Beautify</span>
              <input
                type="checkbox"
                id="beautifyCheckbox"
                className="w-4 h-4 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                onChange={(e) => setIsBeautify(e.target.checked)}
              />
            </div>
            {/* JSON Textarea */}
            <div>
              <textarea
                id="jsonTextarea"
                //h-64 , max-h-[30vh]
                className="w-full min-h-[24vh] p-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                readOnly
                // value={JSON.stringify(treeData, null, isBeautify ? 2 : 0)}
                value={
                  exportedData
                    ? isBeautify
                      ? JSON.stringify(
                          handleRemoveIdFromObject(exportedData),
                          null,
                          4
                        )
                      : formatCompactJson(
                          handleRemoveIdFromObject(exportedData)
                        )
                    : "Click Export to see the JSON."
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TreeView;
