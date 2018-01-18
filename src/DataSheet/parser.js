import {
  Parser as FormulaParser,
  SUPPORTED_FORMULAS,
} from 'hot-formula-parser';

const onCallCellValue = (cellCoord, done) => {
  console.log(cellCoord);
};

export const initParser = () => {
  const parser = new FormulaParser();

  // parser.on('callCellValue', onCallCellValue);

  return parser;
};
