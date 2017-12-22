export const CellDimensions = {
  Height: 25,
  Width: 100,
};

export const CellDimensionPixelValues = {
  Height: CellDimensions.Height + 'px',
  Width: CellDimensions.Width + 'px',
};

export const rowOffset = verticalOffset =>
  Math.round(verticalOffset / CellDimensions.Height);

export const columnOffset = horizontalOffset =>
  Math.round(horizontalOffset / CellDimensions.Width);

export const cellsInView = (tableDimension, cellDimension) =>
  Math.ceil(tableDimension / cellDimension);

export const rowsInView = tableHeight =>
  cellsInView(tableHeight, CellDimensions.Height);

export const columnsInView = tableWidth =>
  cellsInView(tableWidth, CellDimensions.Width);

export const rowRangeToRender = (offset, tableHeight) =>
  offset + rowsInView(tableHeight);

export const columnRangeToRender = (offset, tableWidth) =>
  offset + columnsInView(tableWidth);

export const maxHorizontalScroll = (tableWidth, totalColumnCount) => {
  const viewColumnCount = columnsInView(tableWidth) - 1;
  const maxOffset = totalColumnCount - viewColumnCount;
  const maxScroll = CellDimensions.Width * maxOffset;

  return maxScroll;
};

export const maxVerticalScroll = (tableHeight, totalRowCount) => {
  const viewRowCount = rowsInView(tableHeight) - 1;
  const maxOffset = totalRowCount - viewRowCount;
  const maxScroll = CellDimensions.Height * maxOffset;

  return maxScroll;
};

export const generateCellCoordinates = (rowIndex, columnIndex) => [
  rowIndex * CellDimensions.Height,
  columnIndex * CellDimensions.Width,
];

export const generateCellStyles = cellCoordinates => ({
  // width: CellDimensionPixelValues.Width,
  // height: CellDimensionPixelValues.Height,
  top: cellCoordinates[0],
  left: cellCoordinates[1],
  // position: 'absolute',
});

const isSelected = (selectedCell, row, col) => {
  if (!selectedCell) return false;

  return selectedCell[0] === col && selectedCell[1] === row;
};

const topRowRange = ({
  horizontalOffset,
  tableWidth,
  cellRenderer,
  styleCache,
  columnCount,
  renderedCells,
  selectedCell,
}) => {
  const columnStopIndex = Math.min(
    columnRangeToRender(horizontalOffset, tableWidth) + 1,
    columnCount - 1
  );

  for (
    let columnIndex = horizontalOffset + 1;
    columnIndex <= columnStopIndex;
    columnIndex++
  ) {
    const key = `0:${columnIndex}`;

    const xCord = columnIndex - horizontalOffset;
    const cordKey = `0:${xCord}`;

    if (!styleCache[cordKey]) {
      styleCache[cordKey] = generateCellStyles(
        generateCellCoordinates(0, xCord)
      );
    }

    const style = styleCache[cordKey];

    const cellParams = {
      style,
      rowIndex: 0,
      columnIndex,
      key,
      isSelected: isSelected(selectedCell, 0, columnIndex),
    };

    renderedCells.push(cellRenderer(cellParams));
  }
};

const leftColumnRange = ({
  verticalOffset,
  tableHeight,
  cellRenderer,
  styleCache,
  rowCount,
  renderedCells,
  selectedCell,
}) => {
  const verticalStopIndex = Math.min(
    rowRangeToRender(verticalOffset, tableHeight) + 1,
    rowCount - 1
  );

  for (
    let rowIndex = verticalOffset + 1;
    rowIndex <= verticalStopIndex;
    rowIndex++
  ) {
    const key = `${rowIndex}:0`;

    const yCord = rowIndex - verticalOffset;
    const cordKey = `${yCord}:0`;

    if (!styleCache[cordKey]) {
      styleCache[cordKey] = generateCellStyles(
        generateCellCoordinates(yCord, 0)
      );
    }

    // const style = generateCellStyles(generateCellCoordinates(0, xCord));
    const style = styleCache[cordKey];

    renderedCells.push(
      cellRenderer({
        style,
        rowIndex,
        columnIndex: 0,
        key,
        isSelected: isSelected(selectedCell, rowIndex, 0),
      })
    );
  }
};

export const cellRange = ({
  verticalOffset,
  horizontalOffset,
  tableHeight,
  tableWidth,
  cellRenderer,
  styleCache,
  rowCount,
  columnCount,
  selectedCell,
  isSelectedCellEditing,
}) => {
  const renderedCells = [];
  let selectedCellHasRendered = false;

  topRowRange({
    horizontalOffset,
    tableWidth,
    cellRenderer,
    styleCache,
    columnCount,
    renderedCells,
    selectedCell,
  });

  leftColumnRange({
    verticalOffset,
    tableHeight,
    cellRenderer,
    styleCache,
    rowCount,
    renderedCells,
    selectedCell,
  });

  const contentVerticalOffset = verticalOffset + 1;
  const contentHorizontalOffset = horizontalOffset + 1;

  const verticalStopIndex = Math.min(
    rowRangeToRender(contentVerticalOffset, tableHeight),
    rowCount - 1
  );

  const columnStopIndex = Math.min(
    columnRangeToRender(contentHorizontalOffset, tableWidth),
    columnCount - 1
  );

  for (
    let rowIndex = contentVerticalOffset;
    rowIndex <= verticalStopIndex;
    rowIndex++
  ) {
    const yCord = rowIndex - contentVerticalOffset + 1;

    for (
      let columnIndex = contentHorizontalOffset;
      columnIndex <= columnStopIndex;
      columnIndex++
    ) {
      const key = `${rowIndex}:${columnIndex}`;

      const xCord = columnIndex - contentHorizontalOffset + 1;
      const cordKey = `${yCord}:${xCord}`;

      if (!styleCache[cordKey]) {
        styleCache[cordKey] = generateCellStyles(
          generateCellCoordinates(yCord, xCord)
        );
      }

      let isCellSelected = false;

      if (!selectedCellHasRendered) {
        isCellSelected = selectedCellHasRendered = isSelected(
          selectedCell,
          rowIndex,
          columnIndex
        );
      }

      const style = styleCache[cordKey];

      const cellParams = {
        style,
        rowIndex,
        columnIndex,
        key,
        isSelected: isCellSelected,
        isSelectedCellEditing: isCellSelected && isSelectedCellEditing,
      };

      renderedCells.push(cellRenderer(cellParams));
    }
  }

  return renderedCells;
};
