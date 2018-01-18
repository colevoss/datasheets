const cellToData = cellValue => ({
  error: null,
  value: '',
  formula: null,
});

export const transformData = data => {
  return data.map(row => row.map(cellToData));
};
