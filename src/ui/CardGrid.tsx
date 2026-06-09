/** Renders `count` cards in explicit rows of `columns` (visual grid == nav grid). */

import React from "react";
import { Box } from "ink";

export function CardGrid({
  count,
  columns,
  render,
}: {
  count: number;
  columns: number;
  render: (index: number) => React.ReactNode;
}): React.JSX.Element {
  const rows = Math.ceil(count / columns);
  return (
    <Box flexDirection="column">
      {Array.from({ length: rows }, (_, ri) => (
        <Box key={ri} flexDirection="row">
          {Array.from({ length: Math.min(columns, count - ri * columns) }, (_, ci) => {
            const i = ri * columns + ci;
            return (
              <Box key={i} marginRight={2} marginBottom={1}>
                {render(i)}
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}
