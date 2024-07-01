import React, { useState, useCallback, useEffect, useMemo } from "react";
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
  useReactFlow,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";

const CustomNode = React.memo(({ id, data }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const displayProbabilities = () => {
    const { probabilities, label, calculatedProbability } = data;
    if (calculatedProbability !== undefined) {
      return `P(${label}) = ${calculatedProbability.toFixed(4)}`;
    }
    if (Object.keys(probabilities).length === 2 && "true" in probabilities) {
      return `P(${label}) = ${probabilities.true.toFixed(4)}`;
    }
    return Object.entries(probabilities)
      .map(
        ([condition, prob]) => `P(${label}|${condition}) = ${prob.toFixed(4)}`
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
        {data.calculatedProbability !== undefined
          ? `P(${data.label}) = ${data.calculatedProbability.toFixed(4)}`
          : "Calculating..."}
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

const NodeConfigModal = React.memo(
  ({ node, onClose, onSave, nodes, edges }) => {
    const [name, setName] = useState(node ? node.data.label : "");
    const [probabilities, setProbabilities] = useState(
      node ? node.data.probabilities : {}
    );
    const [error, setError] = useState("");

    const parentNodes = edges
      .filter((edge) => edge.target === node.id)
      .map((edge) => nodes.find((n) => n.id === edge.source));

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
  }
);

const BayesianNetworkToolInner = ({
  initialNodes,
  initialEdges,
  onAddNode,
  onRunCalculation,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges || []);
  const [showModal, setShowModal] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const { project } = useReactFlow();

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
                onEdit: onEditNode,
              },
            };
          }
          return node;
        })
      );
    },
    [setNodes, onEditNode]
  );

  const addNode = useCallback(
    (position) => {
      const newNode = {
        id: `node_${Date.now()}`,
        type: "custom",
        position,
        data: {
          label: "New Node",
          probabilities: { true: 0.5, false: 0.5 },
          onEdit: onEditNode,
        },
      };
      setNodes((nds) => [...nds, newNode]);
      if (typeof onAddNode === "function") {
        onAddNode(newNode);
      }
    },
    [setNodes, onEditNode, onAddNode]
  );

  const onPaneClick = useCallback(
    (event) => {
      const position = project({ x: event.clientX, y: event.clientY });
      addNode(position);
    },
    [project, addNode]
  );

  const calculateProbabilities = useCallback(() => {
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));

    const getParents = (nodeId) => {
      return edges
        .filter((edge) => edge.target === nodeId)
        .map((edge) => edge.source);
    };

    const calculateNodeProbability = (nodeId, cache = new Map()) => {
      if (cache.has(nodeId)) {
        return cache.get(nodeId);
      }

      const node = nodeMap.get(nodeId);
      const parents = getParents(nodeId);

      if (parents.length === 0) {
        const prob = node.data.probabilities.true;
        cache.set(nodeId, prob);
        return prob;
      }

      let probability = 0;
      const parentCombinations = generateCombinations(parents);

      for (const combination of parentCombinations) {
        const conditionKey = combination
          .map(([id, value]) => `${nodeMap.get(id).data.label}=${value}`)
          .join(", ");
        const conditionProbability = node.data.probabilities[conditionKey] || 0;
        const parentProbabilities = combination.map(([id, value]) => {
          const parentProb = calculateNodeProbability(id, cache);
          return value === "true" ? parentProb : 1 - parentProb;
        });
        probability +=
          conditionProbability * parentProbabilities.reduce((a, b) => a * b, 1);
      }

      cache.set(nodeId, probability);
      return probability;
    };

    const generateCombinations = (parents) => {
      const combinations = [];
      const generate = (index, current) => {
        if (index === parents.length) {
          combinations.push(current);
          return;
        }
        generate(index + 1, [...current, [parents[index], "true"]]);
        generate(index + 1, [...current, [parents[index], "false"]]);
      };
      generate(0, []);
      return combinations;
    };

    const updatedNodes = nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        calculatedProbability: calculateNodeProbability(node.id),
        onEdit: onEditNode,
      },
    }));

    setNodes(updatedNodes);

    if (typeof onRunCalculation === "function") {
      onRunCalculation(updatedNodes);
    }
  }, [nodes, edges, setNodes, onRunCalculation, onEditNode]);

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

  useEffect(() => {
    calculateProbabilities();
  }, [calculateProbabilities]);

  useEffect(() => {
    setNodes(initialNodes || []);
    setEdges(initialEdges || []);
  }, [initialNodes, initialEdges]);

  const memoizedReactFlow = useMemo(
    () => (
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    ),
    [nodes, edges, onNodesChange, onEdgesChange, onConnect, onPaneClick]
  );

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {memoizedReactFlow}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          background: "white",
          padding: "10px",
          borderRadius: "5px",
          boxShadow: "0 0 10px rgba(0,0,0,0.1)",
        }}
      >
        <h3>Instructions:</h3>
        <ul>
          <li>Click on the canvas to add a new node</li>
          <li>Drag between nodes to create edges</li>
          <li>Click 'Edit' on a node to configure probabilities</li>
          <li>Probabilities are automatically calculated</li>
        </ul>
      </div>
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

const BayesianNetworkTool = (props) => (
  <ReactFlowProvider>
    <BayesianNetworkToolInner {...props} />
  </ReactFlowProvider>
);

export default BayesianNetworkTool;
