import React from 'react';
import './DataSheet.css';
import classnames from 'classnames';

const cellClassName = isSelected =>
  classnames('Cell', {
    selected: isSelected,
  });

export default class Cell extends React.Component {
  state = {
    currentValue: '',
  };

  shouldComponentUpdate(nextProps, nextState) {
    const editingChanged = nextProps.isEditing !== this.props.isEditing;
    const selectedChanged = nextProps.isSelected !== this.props.isSelected;
    const currentValuedChanged =
      this.state.currentValue !== nextState.currentValue;

    const valueChanged = nextProps.value
      ? nextProps.value.value
      : null !== this.props.value ? this.props.value.value : null;

    const should =
      editingChanged || selectedChanged || currentValuedChanged || valueChanged;

    return should;
  }

  componentWillUpdate(nextProps) {
    this.props.isEditing && !nextProps.isEditing && this.onFinishEditing();
  }

  onFinishEditing() {
    this.props.onFinishEditing(
      this.state.currentValue,
      this.props.col,
      this.props.row
    );
  }

  onInputFocus = i => {
    if (!i) return;

    i.focus();

    const value = this.inputValue();

    const len = String(value).length;

    this.setCurrentValue(value);

    i.setSelectionRange(len, len);
  };

  setCurrentValue = currentValue => {
    this.setState(() => ({ currentValue }));
  };

  inputValue() {
    if (!this.props.value) return '';

    const { value: { formula, error, value } } = this.props;

    return formula || error || value;
  }

  render() {
    const { value, isSelected, isEditing } = this.props;
    const { currentValue } = this.state;

    return (
      <span className={cellClassName(isSelected)}>
        {!isEditing && (
          <span className={isSelected ? 'selected' : ''}>
            {value ? value.error || value.value : ''}
          </span>
        )}

        {isEditing && (
          <input
            type="text"
            ref={this.onInputFocus}
            className="selected"
            value={currentValue}
            onChange={e => this.setCurrentValue(e.target.value)}
          />
        )}
      </span>
    );
  }
}

// {isEditing ? (
//   <input
//     type="text"
//     defaultValue={children}
//     autoFocus
//     onBlur={e => {
//       this.toggleEditing();
//       onChange(row, column, e.target.value);
//     }}
//     onKeyPress={this.handleInputKeyPress}
//     style={{ width: '100%' }}
//   />
// ) : (
//   children
// )}
