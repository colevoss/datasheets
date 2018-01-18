import {
  Parser as FormulaParser,
  columnIndexToLabel,
  rowIndexToLabel,
  extractLabel,
  SUPPORTED_FORMULAS,
} from 'hot-formula-parser';
import uniq from 'lodash.uniq';
import eq from 'lodash.eq';
import difference from 'lodash.difference';
import topsort from 'topsort';

const varReg = /([$])?([A-Za-z]+)([$])?([0-9]+)/g;

export default class DataSource {
  MAX_ROWS = 50;
  MAX_COLUMNS = 50;

  dependencies = {};

  constructor(data) {
    this.generateInitialDependencies(data);

    this.data = this.fillData(data);

    this.initializeParser();
  }

  initializeParser() {
    this.parser = new FormulaParser();

    this.parser.on('callCellValue', this.onCallCellValue);
  }

  onCallCellValue = (data, done) => {
    const { row, column, label } = data;
    const refCell = this.getCellValue(row.index, column.index);

    done(refCell.value);
  };

  getCellVariableRefs(cell) {
    if (!cell) return [];

    const { formula } = cell;
    const matches = this.formulaFromString(formula || '').match(varReg);

    if (!matches) return [];

    return uniq(matches.map(v => v.replace('$', '')));
  }

  addSubscriptionsToCell(subscribedCell, subscribedToCells = []) {
    this.dependencies = subscribedToCells.reduce((deps, cell) => {
      const cellSubscriptions = deps[cell] || [];

      const newCellSubscriptions = [...cellSubscriptions, subscribedCell];

      return {
        ...deps,
        [cell]: newCellSubscriptions,
      };
    }, this.dependencies);
  }

  removeCellDependencies(cellLabel, removeCellDependencies = []) {
    if (removeCellDependencies.length === 0) return;

    this.dependencies = removeCellDependencies.reduce((deps, dep) => {
      const cellSubscriptions = deps[dep].filter(cell => cell !== cellLabel);

      if (cellSubscriptions.length === 0) {
        delete deps[dep];

        return deps;
      }

      return {
        ...deps,
        [dep]: cellSubscriptions,
      };
    }, this.dependencies);
  }

  evaluateCell(value) {
    if (!value) return null;

    return this.valueIsFormula(value)
      ? this.generateFormulaCell(value)
      : {
          forumla: null,
          value,
          error: null,
        };
  }

  updateCell(rowIndex, columnIndex, value) {
    // debugger;
    const cell = this.evaluateCell(value);

    const prevCell = this.getCellValue(rowIndex, columnIndex);

    this.setCellValue(rowIndex, columnIndex, cell);
    this.updateSubscriptionsForCell(rowIndex, columnIndex, cell, prevCell);
  }

  updateSubscriptionsForCell(rowIndex, columnIndex, cell, prevCell) {
    const varRefs = this.getCellVariableRefs(cell);
    const prevVarRefs = this.getCellVariableRefs(prevCell);

    const thisCellLabel = this.toLabel(rowIndex, columnIndex);

    const depsToAdd = difference(varRefs, prevVarRefs);
    const depsToRemove = difference(prevVarRefs, varRefs);

    this.addSubscriptionsToCell(thisCellLabel, depsToAdd);
    this.removeCellDependencies(thisCellLabel, depsToRemove);

    const deps = this.generateDependencyGraphStartingAt(thisCellLabel);

    this.topologicallyUpdateDependencies(deps);
  }

  topologicallyUpdateDependencies(deps) {
    const top = topsort(deps);

    while (top.length) {
      this.evaluateAndUpdateDataForCell(top[0]);

      top.shift();
    }
  }

  evaluateAndUpdateDataForCell = cellLabel => {
    const [{ index: rowIndex }, { index: colIndex }] = extractLabel(cellLabel);

    const cell = this.getCellValue(rowIndex, colIndex);

    const newCell = this.evaluateCell(
      this.isCellBlank(cell) ? null : cell.formula || cell.value
    );

    this.setCellValue(rowIndex, colIndex, newCell);
  };

  generateDependencyGraphStartingAt(cellLabel, graph = []) {
    const deps = this.dependencies[cellLabel];
    if (!deps) return graph;

    const thisDeps = deps.map(dep => [cellLabel, dep]);

    const updatedGraph = [...graph, ...thisDeps];

    const nextGraph = deps.reduce((d, dep) => {
      return [...d, ...this.generateDependencyGraphStartingAt(dep)];
    }, updatedGraph);

    return nextGraph;
  }

  generateFormulaCell(value) {
    const formula = this.formulaFromString(value);

    const parsed = this.parser.parse(formula);

    return {
      formula: value,
      value: parsed.result,
      error: parsed.error,
    };
  }

  valueIsFormula = value => {
    return value[0] === '=';
  };

  formulaFromString = (value = '') => {
    if (!this.valueIsFormula(value)) return value;

    return value.substr(1);
  };

  setCellValue(rowIndex, columnIndex, cell) {
    this.data[rowIndex][columnIndex] = cell;
  }

  toLabel(row, column) {
    return columnIndexToLabel(column) + rowIndexToLabel(row);
  }

  getCellValue(row, column) {
    return this.data[row][column];
  }

  isCellBlank(cell) {
    if (!cell) return true;

    return !cell.value && !cell.formula;
  }

  longestRow() {
    const longestRow = this.data.reduce((max, row) => {
      let i = row.length - 1;

      for (i; i >= 0; i--) {
        if (!this.isCellBlank(row[i])) {
          break;
        }
      }

      return Math.max(i, max);
    }, 0);

    return longestRow;
  }

  lastNonEmptyRow(maxRowLength) {
    let i = this.data.length - 1;

    for (i; i >= 0; i--) {
      const upperJ = maxRowLength || this.data[i].length;
      let isRowBlank = false;

      for (let j = 0; j < upperJ; j++) {
        const cell = this.data[i][j];

        if (!this.isCellBlank(cell)) {
          isRowBlank = true;
          break;
        }
      }

      if (isRowBlank) break;
    }

    return i;
  }

  pruneData() {
    const longestRow = this.longestRow();
    const lastNonEmptyRow = this.lastNonEmptyRow(longestRow + 1);

    const pruned = this.data
      .slice(0, lastNonEmptyRow + 1)
      .map(row => row.slice(0, longestRow + 1));

    return pruned;
  }

  fillData = data => {
    const dataWithFilledRows = data.map(this.fillRow);

    const rowCount = dataWithFilledRows.length;
    const rowsToAdd = this.MAX_ROWS - rowCount;

    const emptyRow = this.generateEmptyRow();

    const newRows = [];

    for (let i = 0; i < rowsToAdd; i++) {
      newRows.push(emptyRow.slice());
    }

    const dataWithRows = dataWithFilledRows.concat(newRows);

    return dataWithRows;
  };

  fillRow = row => {
    const columnCount = row.length;
    const columnsToAdd = this.MAX_COLUMNS - columnCount;

    if (columnsToAdd === 0) return row;

    const emptyColumns = Array(columnsToAdd).fill(null);

    return row.concat(emptyColumns);
  };

  generateEmptyRow() {
    return Array(this.MAX_COLUMNS).fill(null);
  }

  rowCount() {
    return this.MAX_ROWS;
  }

  columnCount() {
    return this.MAX_COLUMNS;
  }

  generateInitialDependencies(data) {
    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];

      for (let columnIndex = 0; columnIndex < row.length; columnIndex++) {
        const cell = row[columnIndex];

        const cellLabel = this.toLabel(rowIndex, columnIndex);
        const varRefs = this.getCellVariableRefs(cell);

        this.addSubscriptionsToCell(cellLabel, varRefs);
      }
    }
  }
}
