import React from 'react';
import './DataSheet.css';
import classnames from 'classnames';

const cellClassName = isSelected =>
  classnames('Cell', {
    selected: isSelected,
  });

export default class Cell extends React.Component {
  shouldComponentUpdate(nextProps, nextState) {
    const should =
      nextProps.isEditing !== this.props.isEditing ||
      nextProps.isSelected !== this.props.isSelected;

    return should;
  }

  // inputRef = i => {
  //   this.input = i;
  // };

  // handleInputKeyPress = e => {
  //   if (e.key === 'Enter') {
  //     this.toggleEditing();
  //     this.props.onChange(this.props.row, this.props.column, e.target.value);
  //   }
  // };
  onInputFocus = i => {
    if (!i) return;

    i.focus();

    const len = String(this.props.value).length;
    i.setSelectionRange(len, len);
  };

  render() {
    const { value, isSelected, isEditing } = this.props;
    // const { isEditing } = this.state;

    return (
      <span className={cellClassName(isSelected)}>
        {!isEditing && (
          <span className={isSelected ? 'selected' : ''}>{value}</span>
        )}

        {isEditing && (
          <input
            type="text"
            ref={this.onInputFocus}
            className="selected"
            defaultValue={value}
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
