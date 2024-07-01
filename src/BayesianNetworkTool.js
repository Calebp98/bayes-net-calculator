import React, { useState, useCallback, useEffect } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";

const CustomNode = React.memo(({ id, data }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const displayProbabilities = () => {
    const { probabilities, label } = data;
    if (Object.keys(probabilities).length === 2 && "true" in probabilities) {
      return `P(${label}) = ${probabilities.true.toFixed(2)}`;
    }
    return Object.entries(probabilities)
      .map(
        ([condition, prob]) => `P(${label}|${condition}) = ${prob.toFixed(2)}`
      )
      .join("\n");
  };

  return (
    <div
      style={{
        backgroundColor: "white",
        padding: "10px",
        borderRadius: "5px",
        border: "1px solid #ddd",
        textAlign: "center",
        position: "relative",
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Handle type="target" position={Position.Top} id={`${id}-target`} />
      <div style={{ fontWeight: "bold" }}>{data.label}</div>
      <div style={{ fontSize: "0.8em", marginTop: "5px" }}>
        {Object.keys(data.probabilities).length === 2 &&
        "true" in data.probabilities
          ? `P(${data.label}) = ${data.probabilities.true.toFixed(2)}`
          : "Hover for probabilities"}
      </div>
      <button
        onClick={() => data.onEdit(id)}
        style={{
          marginTop: "5px",
          backgroundColor: "#4CAF50",
          border: "none",
          color: "white",
          padding: "5px 10px",
          textAlign: "center",
          fontSize: "12px",
          cursor: "pointer",
          borderRadius: "3px",
        }}
      >
        Edit
      </button>
      <Handle type="source" position={Position.Bottom} id={`${id}-source`} />
      {showTooltip && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "rgba(0,0,0,0.8)",
            color: "white",
            padding: "5px",
            borderRadius: "3px",
            fontSize: "0.8em",
            whiteSpace: "pre-line",
            zIndex: 1000,
          }}
        >
          {displayProbabilities()}
        </div>
      )}
    </div>
  );
});

const nodeTypes = {
  custom: CustomNode,
};

const NodeConfigModal = ({ node, onClose, onSave, nodes, edges }) => {
  const [name, setName] = useState(node ? node.data.label : "");
  const [probabilities, setProbabilities] = useState(
    node ? node.data.probabilities : {}
  );
  const [error, setError] = useState("");

  const parentNodes = edges
    .filter((edge) => edge.target === node.id)
    .map((edge) => nodes.find((n) => n.id === edge.source));

  const generateProbabilityInputs = () => {
    if (parentNodes.length === 0) {
      return (
        <div>
          <label>P({name}):</label>
          <input
            type="number"
            value={probabilities.true || 0}
            onChange={(e) =>
              setProbabilities({
                true: parseFloat(e.target.value),
                false: 1 - parseFloat(e.target.value),
              })
            }
            step="0.01"
            min="0"
            max="1"
          />
        </div>
      );
    }
    const combinations = generateCombinations(parentNodes);
    return combinations.map((combination, index) => (
      <div key={index}>
        <label>
          P({name} | {combination}):
        </label>
        <input
          type="number"
          value={probabilities[combination] || 0}
          onChange={(e) => {
            const newProbs = { ...probabilities };
            newProbs[combination] = parseFloat(e.target.value);
            setProbabilities(newProbs);
          }}
          step="0.01"
          min="0"
          max="1"
        />
      </div>
    ));
  };

  const generateCombinations = (parents) => {
    const combinations = [];
    const generate = (index, current) => {
      if (index === parents.length) {
        combinations.push(current.join(", "));
        return;
      }
      generate(index + 1, [...current, `${parents[index].data.label}=true`]);
      generate(index + 1, [...current, `${parents[index].data.label}=false`]);
    };
    generate(0, []);
    return combinations;
  };

  const handleSave = () => {
    if (!node || !node.id) {
      setError("Invalid node data. Unable to save changes.");
      return;
    }
    onSave({ id: node.id, name, probabilities });
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        backgroundColor: "white",
        padding: "20px",
        borderRadius: "5px",
        boxShadow: "0 0 10px rgba(0,0,0,0.1)",
        zIndex: 1000,
        maxHeight: "80vh",
        overflowY: "auto",
      }}
    >
      <h2>Configure Node</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Node Name"
        style={{ display: "block", marginBottom: "10px" }}
      />
      <div>{generateProbabilityInputs()}</div>
      <button onClick={handleSave} style={{ marginRight: "10px" }}>
        Save
      </button>
      <button onClick={onClose}>Cancel</button>
    </div>
  );
};

const BayesianNetworkTool = ({
  initialNodes,
  initialEdges,
  onAddNode,
  onRunSimulation,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges || []);
  const [showModal, setShowModal] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [simulationResult, setSimulationResult] = useState(null);

  const onEditNode = useCallback(
    (nodeId) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        setSelectedNode(node);
        setShowModal(true);
      } else {
        console.error(`Node with id ${nodeId} not found`);
      }
    },
    [nodes]
  );

  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          onEdit: onEditNode,
        },
      }))
    );
  }, [setNodes, onEditNode]);

  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            markerEnd: { type: MarkerType.ArrowClosed },
            animated: true,
          },
          eds
        )
      ),
    [setEdges]
  );

  const onSaveNode = useCallback(
    (data) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === data.id) {
            return {
              ...node,
              data: {
                ...node.data,
                label: data.name,
                probabilities: data.probabilities,
              },
            };
          }
          return node;
        })
      );
    },
    [setNodes]
  );

  const addNode = useCallback(() => {
    const newNode = {
      id: `node_${Date.now()}`,
      type: "custom",
      data: {
        label: "New Node",
        probabilities: { true: 0.5, false: 0.5 },
        onEdit: onEditNode,
      },
      position: { x: Math.random() * 500, y: Math.random() * 300 },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes, onEditNode]);

  const runMonteCarloSimulation = useCallback(() => {
    if (!nodes || nodes.length === 0 || !edges || edges.length === 0) {
      console.error("Nodes or edges are not properly initialized");
      return;
    }

    const numSimulations = 100000;
    let wetCount = 0;

    // Map node labels to their respective nodes for quick lookup
    const labelToNodeMap = {};
    nodes.forEach((node) => {
      if (node.data && node.data.label) {
        labelToNodeMap[node.data.label] = node;
      }
    });

    // Function to get the probability of a node being true
    const getProbability = (label, condition) => {
      const node = labelToNodeMap[label];
      if (node && node.data) {
        if (condition) {
          return node.data.probabilities[condition] || 0;
        }
        return node.data.probabilities.true || 0;
      }
      return 0;
    };

    // Function to run a single simulation
    const runSimulation = () => {
      const state = {};

      // Simulate each node's state based on its probabilities and parent conditions
      nodes.forEach((node) => {
        const { label } = node.data;
        const parents = edges
          .filter((edge) => edge.target === node.id)
          .map((edge) => labelToNodeMap[edge.source]?.data?.label);

        let condition = "";
        if (parents.length > 0) {
          condition = parents
            .map((parent) => `${parent}=${state[parent] ? "true" : "false"}`)
            .join(", ");
        }

        const prob = getProbability(label, condition);
        state[label] = Math.random() < prob;
      });

      // Check if the specific condition we are interested in is met (e.g., "Grass Wet" is true)
      if (state["Grass Wet"]) {
        wetCount++;
      }
    };

    for (let i = 0; i < numSimulations; i++) {
      runSimulation();
    }

    const probability = wetCount / numSimulations;
    setSimulationResult(probability);
  }, [nodes, edges]);

  useEffect(() => {
    onAddNode.current = addNode;
    onRunSimulation.current = runMonteCarloSimulation;
  }, [addNode, runMonteCarloSimulation, onAddNode, onRunSimulation]);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges]);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
      {simulationResult !== null && (
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            backgroundColor: "white",
            padding: "10px",
            borderRadius: "5px",
            boxShadow: "0 0 10px rgba(0,0,0,0.1)",
          }}
        >
          <p>P(Grass Wet) ≈ {simulationResult.toFixed(4)}</p>
        </div>
      )}
      {showModal && selectedNode && (
        <NodeConfigModal
          node={selectedNode}
          nodes={nodes}
          edges={edges}
          onClose={() => {
            setShowModal(false);
            setSelectedNode(null);
          }}
          onSave={onSaveNode}
        />
      )}
    </div>
  );
};

export default BayesianNetworkTool;
