/**
 * Demo 07 — LangChain-style approach (simulated): declarative state graph
 *
 * Task: "Read a file, count lines, report the result"
 * Shows: StateGraph with nodes + conditional edges, declarative definition.
 * A different mental model: graphs vs loops.
 *
 * No real LangChain dependency — we simulate the StateGraph pattern.
 */

import { printSection, printEvent } from "@pi-tutorial/shared";

// ── State type ─────────────────────────────────────────────────────────
interface AgentState {
  task: string;
  messages: Array<{ role: string; content: string }>;
  toolCalls: Array<{ name: string; input: Record<string, string> }>;
  currentResult: string;
  done: boolean;
}

// ── Simulated StateGraph ───────────────────────────────────────────────
type NodeFn = (state: AgentState) => AgentState;
type EdgeCondition = (state: AgentState) => string;

class StateGraph {
  private nodes = new Map<string, NodeFn>();
  private edges = new Map<string, string | EdgeCondition>();
  private entryPoint = "";

  addNode(name: string, fn: NodeFn): this {
    this.nodes.set(name, fn);
    return this;
  }

  addEdge(from: string, to: string): this {
    this.edges.set(from, to);
    return this;
  }

  addConditionalEdge(from: string, condition: EdgeCondition): this {
    this.edges.set(from, condition);
    return this;
  }

  setEntryPoint(name: string): this {
    this.entryPoint = name;
    return this;
  }

  compile() {
    const nodes = this.nodes;
    const edges = this.edges;
    const entry = this.entryPoint;

    return {
      invoke(initialState: AgentState): AgentState {
        let current = entry;
        let state = { ...initialState };

        while (current !== "__end__") {
          const nodeFn = nodes.get(current);
          if (!nodeFn) throw new Error(`Unknown node: ${current}`);

          printEvent("GRAPH_NODE", current);
          state = nodeFn(state);

          const edge = edges.get(current);
          if (typeof edge === "function") {
            current = edge(state);
          } else {
            current = edge ?? "__end__";
          }
        }

        return state;
      },
    };
  }
}

// ── Define the graph ───────────────────────────────────────────────────
const graph = new StateGraph()
  .addNode("llm_call", (state) => {
    // Simulated LLM deciding what tool to call
    if (state.toolCalls.length === 0) {
      state.toolCalls.push({ name: "read_file", input: { path: "data.txt" } });
    } else if (!state.done) {
      state.toolCalls.push({ name: "count_lines", input: { text: state.currentResult } });
      state.done = true;
    }
    return state;
  })
  .addNode("tool_exec", (state) => {
    const call = state.toolCalls[state.toolCalls.length - 1];
    printEvent("TOOL_EXEC", `${call.name}(${JSON.stringify(call.input).slice(0, 60)})`);

    if (call.name === "read_file") {
      state.currentResult = "line 1\nline 2\nline 3\nline 4\nline 5\n";
    } else if (call.name === "count_lines") {
      const count = call.input.text.split("\n").filter(Boolean).length;
      state.currentResult = `The file has ${count} lines.`;
    }

    state.messages.push({ role: "tool", content: state.currentResult });
    return state;
  })
  .setEntryPoint("llm_call")
  .addEdge("llm_call", "tool_exec")
  .addConditionalEdge("tool_exec", (state) =>
    state.done ? "__end__" : "llm_call"
  );

// ── Run ────────────────────────────────────────────────────────────────
printSection("LangChain-Style: Declarative State Graph");
console.log("Graph: llm_call -> tool_exec -> (done? end : llm_call)\n");

const result = graph.compile().invoke({
  task: "Read data.txt, count lines, report",
  messages: [],
  toolCalls: [],
  currentResult: "",
  done: false,
});

printEvent("RESULT", result.currentResult);
