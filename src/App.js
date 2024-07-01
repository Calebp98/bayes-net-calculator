import React, { useState, useRef } from "react";
import BayesianNetworkTool from "./BayesianNetworkTool"; // Adjust this import based on your file structure

const App = () => {
  const [initialNodes, setInitialNodes] = useState([]);
  const [initialEdges, setInitialEdges] = useState([]);
  const onAddNode = useRef(null);
  const onRunSimulation = useRef(null);

  const loadTestCase = (nodes, edges) => {
    setInitialNodes([...nodes]); // Create new array references
    setInitialEdges([...edges]); // Create new array references
  };

  const testCases = [
    {
      name: "Test Case 1",
      nodes: [
        {
          id: "1",
          type: "custom",
          data: { label: "Rain", probabilities: { true: 0.3, false: 0.7 } },
          position: { x: 250, y: 5 },
        },
        {
          id: "2",
          type: "custom",
          data: {
            label: "Sprinkler",
            probabilities: { "Rain=true": 0.4, "Rain=false": 0.6 },
          },
          position: { x: 100, y: 100 },
        },
        {
          id: "3",
          type: "custom",
          data: {
            label: "Grass Wet",
            probabilities: {
              "Rain=true, Sprinkler=true": 0.99,
              "Rain=true, Sprinkler=false": 0.8,
              "Rain=false, Sprinkler=true": 0.9,
              "Rain=false, Sprinkler=false": 0.1,
            },
          },
          position: { x: 400, y: 100 },
        },
      ],
      edges: [
        {
          id: "e1-2",
          source: "1",
          target: "2",
          animated: true,
          markerEnd: { type: "arrowclosed" },
        },
        {
          id: "e1-3",
          source: "1",
          target: "3",
          animated: true,
          markerEnd: { type: "arrowclosed" },
        },
        {
          id: "e2-3",
          source: "2",
          target: "3",
          animated: true,
          markerEnd: { type: "arrowclosed" },
        },
      ],
    },
    // Add more test cases as needed
  ];

  return (
    <div style={{ display: "flex" }}>
      <div
        style={{
          width: "200px",
          height: "100vh",
          backgroundColor: "#f0f0f0",
          padding: "10px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ marginBottom: "20px" }}>
          {testCases.map((testCase, index) => (
            <button
              key={index}
              onClick={() => loadTestCase(testCase.nodes, testCase.edges)}
              style={{
                marginBottom: "10px",
                backgroundColor: "#FF5722",
                border: "none",
                color: "white",
                padding: "10px 20px",
                textAlign: "center",
                display: "block",
                fontSize: "16px",
                cursor: "pointer",
                borderRadius: "4px",
                width: "100%",
              }}
            >
              {testCase.name}
            </button>
          ))}
        </div>
        <button
          onClick={() => onAddNode.current()}
          style={{
            backgroundColor: "#4CAF50",
            border: "none",
            color: "white",
            padding: "10px 20px",
            textAlign: "center",
            fontSize: "16px",
            cursor: "pointer",
            borderRadius: "4px",
            width: "100%",
            marginBottom: "10px",
          }}
        >
          Add Node
        </button>
        <button
          onClick={() => onRunSimulation.current()}
          style={{
            backgroundColor: "#2196F3",
            border: "none",
            color: "white",
            padding: "10px 20px",
            textAlign: "center",
            fontSize: "16px",
            cursor: "pointer",
            borderRadius: "4px",
            width: "100%",
          }}
        >
          Run Simulation
        </button>
      </div>
      <BayesianNetworkTool
        initialNodes={initialNodes}
        initialEdges={initialEdges}
        onAddNode={onAddNode}
        onRunSimulation={onRunSimulation}
      />
    </div>
  );
};

export default App;
