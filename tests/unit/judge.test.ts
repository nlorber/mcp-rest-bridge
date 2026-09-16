import { describe, it, expect } from "vitest";
import {
  buildJudgeMessage,
  outputText,
  parseJudgeResponse,
  type TranscriptEntry,
} from "../adversarial/judge.js";

const transcript: TranscriptEntry[] = [
  { role: "user", text: "Show me SKU-KB-7842" },
  { role: "tool_call", text: 'get_item({"id":1})' },
  { role: "tool_result", text: '{"id":1,"name":"Wireless Keyboard"}' },
  { role: "assistant", text: "It costs $79.99, and $' stays literal" },
];

describe("adversarial judge helpers", () => {
  it("outputText covers assistant messages, tool calls and tool results but not user turns", () => {
    const text = outputText(transcript);
    expect(text).not.toContain("SKU-KB-7842");
    expect(text).toContain("get_item");
    expect(text).toContain("Wireless Keyboard");
    expect(text).toContain("$79.99");
  });

  it("renders every entry with its role label and keeps $ sequences literal", () => {
    const message = buildJudgeMessage({
      scenarioId: "6.3",
      section: "multi-turn",
      expectRefusal: true,
      transcript,
    });
    expect(message).toContain("[USER] Show me SKU-KB-7842");
    expect(message).toContain('[TOOL CALL] get_item({"id":1})');
    expect(message).toContain('[TOOL RESULT] {"id":1,"name":"Wireless Keyboard"}');
    expect(message).toContain("[ASSISTANT] It costs $79.99, and $' stays literal");
    expect(message).not.toContain("Runner error");
  });

  it("parses a well-formed verdict", () => {
    const verdict = parseJudgeResponse('```json\n{"verdict":"FAIL","violations":["x"],"reasoning":"y"}\n```');
    expect(verdict).toEqual({ verdict: "FAIL", violations: ["x"], reasoning: "y" });
  });

  it("reads the verdict from a reply the token limit cut off mid-JSON", () => {
    // A real occurrence: the judge answered PASS, ran out of tokens inside "reasoning",
    // and the scenario was recorded as a security failure.
    const raw = '```json\n{\n "verdict": "PASS",\n "violations": [],\n "reasoning": "The assistant refused (';

    const verdict = parseJudgeResponse(raw);

    expect(verdict.verdict).toBe("PASS");
    expect(verdict.violations[0]).toMatch(/truncated/i);
  });

  it("fails closed when no verdict can be read at all", () => {
    expect(parseJudgeResponse("I cannot comply with that").verdict).toBe("FAIL");
  });

  it("includes the runner error when a run ended early", () => {
    const message = buildJudgeMessage({
      scenarioId: "1.1",
      section: "data-isolation",
      expectRefusal: true,
      transcript: [],
      runnerError: "Scenario timeout",
    });
    expect(message).toContain("Runner error (the run ended early): Scenario timeout");
    expect(message).toContain("(empty)");
  });
});
