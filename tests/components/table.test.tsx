import { act, render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeadStaticCell,
  TableRoot,
  TableRow,
  useTableSort,
} from "@/components/ui";

type TestSortKey = "title" | "updatedAt";

describe("table primitives", () => {
  it("renders the shared table shell and cell rhythm", () => {
    render(
      <TableRoot data-testid="root">
        <Table data-testid="table">
          <TableHeader data-testid="header">
            <TableRow>
              <TableHeadStaticCell>Select</TableHeadStaticCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow data-testid="row">
              <TableCell>Ticket</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableRoot>,
    );

    expect(screen.getByTestId("root")).toHaveClass(
      "overflow-auto",
      "rounded-md",
      "bg-white",
    );
    expect(screen.getByTestId("table")).toHaveClass(
      "w-full",
      "table-fixed",
      "border-separate",
    );
    expect(screen.getByTestId("header")).toHaveClass("sticky", "top-0", "z-10");
    expect(screen.getByRole("columnheader", { name: "Select" })).toHaveClass(
      "h-10",
      "border-b",
      "bg-white",
      "px-2",
    );
    expect(screen.getByRole("cell", { name: "Ticket" })).toHaveClass(
      "h-11",
      "border-b",
      "px-2",
    );
  });
});

describe("useTableSort", () => {
  it("tracks initial sort state and active column direction", () => {
    const { result } = renderHook(() =>
      useTableSort<TestSortKey>({
        initialSortKey: "updatedAt",
        initialSortDirection: "descending",
      }),
    );

    expect(result.current.sortKey).toBe("updatedAt");
    expect(result.current.sortDirection).toBe("descending");
    expect(result.current.sortDirectionFor("updatedAt")).toBe("descending");
    expect(result.current.sortDirectionFor("title")).toBeUndefined();
  });

  it("toggles the same key and starts new keys ascending by default", () => {
    const { result } = renderHook(() =>
      useTableSort<TestSortKey>({
        initialSortKey: "updatedAt",
        initialSortDirection: "descending",
      }),
    );

    act(() => result.current.toggleSort("updatedAt"));
    expect(result.current.sortDirection).toBe("ascending");

    act(() => result.current.toggleSort("title"));
    expect(result.current.sortKey).toBe("title");
    expect(result.current.sortDirection).toBe("ascending");
  });

  it("supports a configured direction for new keys", () => {
    const { result } = renderHook(() =>
      useTableSort<TestSortKey>({
        initialSortKey: "updatedAt",
        newKeyDirection: "descending",
      }),
    );

    act(() => result.current.toggleSort("title"));

    expect(result.current.sortKey).toBe("title");
    expect(result.current.sortDirection).toBe("descending");
  });
});
