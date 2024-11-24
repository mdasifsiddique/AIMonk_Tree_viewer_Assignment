import React, { useState } from "react";
import Collapsible from "react-collapsible";

const TagView = ({
  node,
  onAddChild,
  onDeleteChild,
  onNodeNameChange,
  onNodeDataChange,
  parentNodeId,
  loading,
}) => {
  const [isOpen, setIsOpen] = useState(false); // State to track whether the collapsible is open or closed

  const [isNodeNameEditing, setIsNodeNameEditing] = useState(false);

  return (
    <div className=" min-w-[500px] flex">
      <Collapsible
        open={isOpen}
        trigger={
          <div className="flex items-center justify-between gap-3 px-3 py-2 bg-gray-100 rounded shadow hover:bg-gray-200 w-full min-w-[500px]">
            {/* Left-aligned (Arrow and input field) */}
            <div className="flex items-center ">
              <span className="text-lg font-bold cursor-pointer text-gray-700">
                {isOpen ? "v" : ">"}
              </span>

              {isNodeNameEditing ? (
                <>
                  {/* Input Field */}
                  <input
                    disabled={loading}
                    type="text"
                    value={node.name}
                    title={node.name}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Spacebar") {
                        // Allow adding spaces to the input field
                        e.preventDefault();
                        e.stopPropagation(); // Prevent event propagation to the Collapsible

                        const inputElement = e.target; // Get the input element
                        const { selectionStart, selectionEnd } = inputElement; // Get cursor positions

                        const newValue =
                          node.name.substring(0, selectionStart) +
                          " " +
                          node.name.substring(selectionEnd);

                        onNodeNameChange(node, newValue, parentNodeId);

                        // Move cursor to the position after the space
                        setTimeout(() => {
                          inputElement.selectionStart =
                            inputElement.selectionEnd = selectionStart + 1;
                        }, 0);
                      } else if (e.key === "Enter") {
                        setIsNodeNameEditing(false);
                      } else {
                        // Allow other keys to work normally
                        e.stopPropagation();
                      }
                    }}
                    onChange={(e) => {
                      e.stopPropagation();
                      onNodeNameChange(node, e.target.value, parentNodeId);
                    }}
                    onBlur={() => {
                      setIsNodeNameEditing(false);
                    }}
                    className="px-2 py-1 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ml-2"
                  />
                </>
              ) : (
                <>
                  <div
                    onClick={(e) => {
                      setIsNodeNameEditing(true);
                      e.stopPropagation();
                    }}
                    title={node.name}
                    className="px-2 py-1 bg-blue-400 text-white rounded cursor-pointer hover:bg-blue-500 ml-2 max-w-xs truncate"
                  >
                    {node.name}
                  </div>
                </>
              )}
            </div>

            {/* Right-aligned (Buttons) */}
            <div className="flex space-x-2">
              {/* Add Child Button */}
              <button
                disabled={loading}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(true);
                  onAddChild(node, parentNodeId);
                }}
                className="px-3 py-1 bg-green-500 text-white rounded shadow hover:bg-green-600"
              >
                Add Child
              </button>

              {/* Delete Child Button */}
              <button
                disabled={loading}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChild(parentNodeId, node.id);
                }}
                className="px-3 py-1 bg-red-500 text-white rounded shadow hover:bg-red-600"
              >
                {parentNodeId === node.id ? "Delete Root" : " Delete This Node"}
              </button>
            </div>
          </div>
        }
        onOpening={() => setIsOpen(true)}
        onClosing={() => setIsOpen(false)}
        className="my-2 border border-gray-300 rounded shadow"
        openedClassName="border border-blue-500"
      >
        <div className="ml-5 p-3 bg-white border-l-4 border-blue-500 rounded shadow">
          {node.children && node.children.length > 0 ? (
            node.children.map((childNode) => (
              <TagView
                key={childNode.id}
                node={childNode}
                parentNodeId={node.id}
                onAddChild={onAddChild}
                onDeleteChild={onDeleteChild}
                onNodeNameChange={onNodeNameChange}
                onNodeDataChange={onNodeDataChange}
                loading={loading}
              />
            ))
          ) : (
            <div className="min-w-[500px] flex items-center gap-2 p-2 border border-gray-200 rounded-md shadow-sm bg-gray-50">
              <div className="text-gray-700 font-medium">Data</div>
              <input
                disabled={loading}
                type="text"
                value={node.data}
                title={node.data}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                onChange={(e) =>
                  onNodeDataChange(node, e.target.value, parentNodeId)
                }
              />
            </div>
          )}
        </div>
      </Collapsible>
    </div>
  );
};

export default TagView;
