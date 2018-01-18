import React from 'react';
import Cell from './Cell';
import classnames from 'classnames';
import * as utils from './utils';
import './DataSheet.css';
import rawData from '../arr.js';
import { transformData } from './transformData';
import DataSource from './DataSource';

const varReg = /([$])?([A-Za-z]+)([$])?([0-9]+)/g;

const data = [
  [null, null],
  [null, { forumla: null, value: '156', error: null }],
  [null, { formula: '=B2', value: '156', error: null }],
  [null, { formula: '=B2 + MULTIPLY(B3, 2)', value: 468, error: null }],
];

const datasheetClassnames = isScrolling =>
  classnames('DataSheet', {
    isScrolling,
  });

const ARROW_KEY_CODES = {
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
};

const ARROW_KEY_CODES_LIST = Object.keys(ARROW_KEY_CODES).map(
  key => ARROW_KEY_CODES[key]
);

const TAB_KEY_CODE = 9;

const dataSource = new DataSource(data);

export default class DataSheet extends React.Component {
  state = {
    isScrolling: false,
    selectedCell: [1, 1],
    isSelectedCellEditing: false,
    rowOffset: 0,
    columnOffset: 0,
    width: 0,
    height: 0,
    visibleRows: 0,
    visibleColumns: 0,
  };

  scroll = {
    x: 0,
    y: 0,
  };

  width = 0;
  height = 0;

  maxScrollX = 0;
  maxScrollY = 0;

  styleCache = {};

  componentWillUpdate(nextProps, nextState) {
    this.calculateCells(nextState);
  }

  componentDidMount() {
    this.bindArrowKeys();
    this.bindResize();

    this.onResize();
  }

  componentWillUnmount() {
    this.unbindArrowKeys();
    this.unbindResize();
  }

  calculateCells(state = this.state) {
    const {
      isScrolling,
      selectedCell,
      rowOffset,
      columnOffset,
      width,
      height,
      isSelectedCellEditing,
      visibleColumns,
      visibleRows,
    } = state;

    this.cells = utils.cellRange({
      isSelectedCellEditing,
      isScrolling,
      verticalOffset: rowOffset,
      horizontalOffset: columnOffset,
      tableHeight: height,
      tableWidth: width,
      cellRenderer: this.cellRenderer,
      styleCache: this.styleCache,
      rowCount: dataSource.rowCount(),
      columnCount: dataSource.columnCount(),
      selectedCell,
    });
  }

  bindArrowKeys() {
    document.addEventListener('keydown', this.onKeyDown);
  }

  unbindArrowKeys() {
    document.removeEventListener('keydown', this.onKeyDown);
  }

  bindResize() {
    window.addEventListener('resize', this.onResize);
  }

  unbindResize() {
    window.removeEventListener('resize', this.onResize);
  }

  onFinishEditing = (val, col, row) => {
    let cell;

    dataSource.updateCell(row, col, val);

    this.forceUpdate();
  };

  onResize = () => {
    const width = this.d.offsetWidth;
    const height = this.d.offsetHeight;
    this.setState(
      () => ({
        width,
        height,
      }),
      () => {
        this.maxScrollX = utils.maxHorizontalScroll(
          this.state.width,
          dataSource.columnCount()
        );
        this.maxScrollY = utils.maxVerticalScroll(
          this.state.height,
          dataSource.columnCount()
        );
      }
    );
  };

  onKeyDown = e => {
    const { isSelectedCellEditing } = this.state;

    if (
      (ARROW_KEY_CODES_LIST.indexOf(e.keyCode) > -1 &&
        !isSelectedCellEditing) ||
      e.keyCode === TAB_KEY_CODE
    ) {
      this.handleArrowNav(e);
      return;
    }

    // ENTER
    if (e.keyCode === 13) {
      !isSelectedCellEditing
        ? this.setIsSelectedCellEditing(!isSelectedCellEditing)
        : this.handleArrowNav(e);

      return;
    }

    if (e.key.length === 1) {
      !isSelectedCellEditing &&
        this.setIsSelectedCellEditing(!isSelectedCellEditing);
    }
  };

  setIsSelectedCellEditing = isSelectedCellEditing => {
    this.setState(() => ({ isSelectedCellEditing }));
  };

  handleArrowNav = e => {
    const { keyCode } = e;
    const { selectedCell } = this.state;

    let x = selectedCell[0];
    let y = selectedCell[1];

    switch (keyCode) {
      case ARROW_KEY_CODES.LEFT:
        x = x - 1;
        break;

      case ARROW_KEY_CODES.UP:
        y = y - 1;
        break;

      case TAB_KEY_CODE:
        x = x + 1;
        e.preventDefault();
        break;

      case ARROW_KEY_CODES.RIGHT:
        x = x + 1;
        break;

      case 13:
      case ARROW_KEY_CODES.DOWN:
        y = y + 1;
        break;

      default:
        return;
    }

    const newSelectedCoords = [x, y].map(c => Math.max(0, c));

    if (newSelectedCoords[0] === 0 && newSelectedCoords[1] === 0) return;

    this.selectCell(...newSelectedCoords);
  };

  generateNewScrollState(delta) {
    const adjustX = Math.abs(delta.x) >= Math.abs(delta.y);
    const scrollToAdjust = adjustX ? 'x' : 'y';
    const currentAdjust = this.scroll[scrollToAdjust];
    const adjustDelta = delta[scrollToAdjust]; // / 1.5

    const maxAdjust = adjustX ? this.maxScrollX : this.maxScrollY;

    const newAdjustAmountUnrestricted = currentAdjust + adjustDelta;

    const newMinAdjust = Math.max(0, newAdjustAmountUnrestricted);

    this.scroll[scrollToAdjust] = Math.min(maxAdjust, newMinAdjust);
  }

  onScroll = (x, y) => {
    this.generateNewScrollState({ x, y });

    this.cancelIsScrolling();

    if (!this.state.isScrolling) {
      this.setState(() => ({ isScrolling: true }));
    }

    this.updateScrollState();
  };

  cancelIsScrolling() {
    if (this.cancelScrollTimeout) {
      clearTimeout(this.cancelScrollTimeout);
      this.cancelScrollTimeout = null;
    }

    this.cancelScrollTimeout = setTimeout(
      () => this.setState({ isScrolling: false }),
      60
    );
  }

  updateScrollState = () => {
    const { x, y } = this.scroll;
    const { rowOffset, columnOffset } = this.state;

    const nextVerticalOffset = utils.rowOffset(y);
    const nextHorizontalOffset = utils.columnOffset(x);

    if (
      nextHorizontalOffset === columnOffset &&
      nextVerticalOffset === rowOffset
    )
      return;

    this.setState(() => ({
      rowOffset: nextVerticalOffset,
      columnOffset: nextHorizontalOffset,
    }));

    if (this.state.isScrolling) {
      this.scrollAnim = requestAnimationFrame(this.updateScrollState);
    }
  };

  selectCell = (col, row) => {
    this.setState(() => ({
      selectedCell: [col, row],
      isSelectedCellEditing: false,
    }));
  };

  isCellSelected(col, row) {
    const { selectedCell } = this.state;
    if (!selectedCell) return false;

    return selectedCell[0] === col && selectedCell[1] === row;
  }

  cellRenderer = ({
    style,
    rowIndex,
    columnIndex,
    key,
    isSelected,
    isSelectedCellEditing,
  }) => {
    const val = dataSource.getCellValue(rowIndex, columnIndex);

    return (
      <div
        className="CellContainer"
        style={style}
        key={key}
        onClick={() => this.selectCell(columnIndex, rowIndex)}
      >
        <Cell
          value={val}
          isSelected={isSelected}
          isEditing={isSelectedCellEditing}
          onFinishEditing={this.onFinishEditing}
          col={columnIndex}
          row={rowIndex}
        />
      </div>
    );
  };

  render() {
    return (
      <div
        className={datasheetClassnames(this.state.isScrolling)}
        onWheel={e => {
          e.stopPropagation();
          e.preventDefault();
          this.onScroll(e.deltaX, e.deltaY);
        }}
        ref={ds => (this.d = ds)}
      >
        {this.cells}
      </div>
    );
  }
}
