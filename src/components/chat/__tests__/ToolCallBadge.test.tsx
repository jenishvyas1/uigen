import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge, getToolLabel } from "../ToolCallBadge";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

// getToolLabel

test("getToolLabel: str_replace_editor create", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "/App.jsx" })).toBe("Creating App.jsx");
});

test("getToolLabel: str_replace_editor str_replace", () => {
  expect(getToolLabel("str_replace_editor", { command: "str_replace", path: "/components/Card.jsx" })).toBe("Editing Card.jsx");
});

test("getToolLabel: str_replace_editor insert", () => {
  expect(getToolLabel("str_replace_editor", { command: "insert", path: "/utils/helpers.ts" })).toBe("Editing helpers.ts");
});

test("getToolLabel: str_replace_editor view", () => {
  expect(getToolLabel("str_replace_editor", { command: "view", path: "/App.jsx" })).toBe("Viewing App.jsx");
});

test("getToolLabel: str_replace_editor undo_edit", () => {
  expect(getToolLabel("str_replace_editor", { command: "undo_edit", path: "/App.jsx" })).toBe("Undoing edit in App.jsx");
});

test("getToolLabel: file_manager rename", () => {
  expect(getToolLabel("file_manager", { command: "rename", path: "/old.jsx" })).toBe("Renaming old.jsx");
});

test("getToolLabel: file_manager delete", () => {
  expect(getToolLabel("file_manager", { command: "delete", path: "/App.jsx" })).toBe("Deleting App.jsx");
});

test("getToolLabel: extracts filename from nested path", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "/src/components/Button.tsx" })).toBe("Creating Button.tsx");
});

test("getToolLabel: unknown tool falls back to tool name", () => {
  expect(getToolLabel("some_other_tool", {})).toBe("some_other_tool");
});

test("getToolLabel: str_replace_editor with no command falls back to tool name", () => {
  expect(getToolLabel("str_replace_editor", {})).toBe("str_replace_editor");
});

// ToolCallBadge component

test("ToolCallBadge shows friendly label for create", () => {
  const tool: ToolInvocation = {
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "/App.jsx" },
    state: "call",
  };
  render(<ToolCallBadge toolInvocation={tool} />);
  expect(screen.getByText("Creating App.jsx")).toBeDefined();
});

test("ToolCallBadge shows friendly label for str_replace", () => {
  const tool: ToolInvocation = {
    toolCallId: "2",
    toolName: "str_replace_editor",
    args: { command: "str_replace", path: "/components/Card.jsx" },
    state: "call",
  };
  render(<ToolCallBadge toolInvocation={tool} />);
  expect(screen.getByText("Editing Card.jsx")).toBeDefined();
});

test("ToolCallBadge shows friendly label for file_manager delete", () => {
  const tool: ToolInvocation = {
    toolCallId: "3",
    toolName: "file_manager",
    args: { command: "delete", path: "/old.jsx" },
    state: "call",
  };
  render(<ToolCallBadge toolInvocation={tool} />);
  expect(screen.getByText("Deleting old.jsx")).toBeDefined();
});

test("ToolCallBadge shows spinner when in-progress", () => {
  const tool: ToolInvocation = {
    toolCallId: "4",
    toolName: "str_replace_editor",
    args: { command: "create", path: "/App.jsx" },
    state: "call",
  };
  const { container } = render(<ToolCallBadge toolInvocation={tool} />);
  expect(container.querySelector(".animate-spin")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("ToolCallBadge shows green dot when done", () => {
  const tool: ToolInvocation = {
    toolCallId: "5",
    toolName: "str_replace_editor",
    args: { command: "create", path: "/App.jsx" },
    state: "result",
    result: "File created: /App.jsx",
  };
  const { container } = render(<ToolCallBadge toolInvocation={tool} />);
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

test("ToolCallBadge shows spinner when result is falsy", () => {
  const tool: ToolInvocation = {
    toolCallId: "6",
    toolName: "str_replace_editor",
    args: { command: "create", path: "/App.jsx" },
    state: "result",
    result: "",
  };
  const { container } = render(<ToolCallBadge toolInvocation={tool} />);
  expect(container.querySelector(".animate-spin")).toBeDefined();
});
