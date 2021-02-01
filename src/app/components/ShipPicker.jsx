import React from 'react';
import PropTypes from 'prop-types';
import TranslatedComponent from './TranslatedComponent';
import { Rocket } from './SvgIcons';
import Persist from '../stores/Persist';
import cn from 'classnames';
import { Factory, Ship } from 'ed-forge';
import autoBind from 'auto-bind';
import { isEqual } from 'lodash';

/**
 * Ship picker
 * Requires an onChange() function of the form onChange(ship), providing the ship, which is triggered on ship change
 */
export default class ShipPicker extends TranslatedComponent {
  static propTypes = {
    onChange: PropTypes.func.isRequired,
    ship: PropTypes.instanceOf(Ship).isRequired,
  };

  /**
   * constructor
   * @param {object} props  Properties react
   * @param {object} context   react context
   */
  constructor(props, context) {
    super(props);
    autoBind(this);
    this.state = {
      menuOpen: false,
      opponent: {
        self: true,
        type: props.ship.getShipType(),
        stock: false,
        id: undefined,
      },
    };
  }

  /**
   * Update ship
   * @param {boolean} self True to compare with ship itself
   * @param {object} type The ship type
   * @param {boolean} stock True to compare with a stock version of given type
   * @param {string} id The build's stored ID
   */
  _shipChange(self, type, stock = false, id = null) {
    const opponent = { self, type, stock, id };
    if (isEqual(opponent, this.state.opponent)) {
      this.setState({ menuOpen: false });
    } else {
      const { onChange } = this.props;
      if (self) {
        onChange(this.props.ship);
      } else if (stock) {
        onChange(Factory.newShip(type));
      } else {
        onChange(new Ship(Persist.getBuild(type, id)));
      }
      this.setState({ menuOpen: false, opponent });
    }
  }

  /**
   * Render the menu for the picker
   * @returns {object}    the picker menu
   */
  _renderPickerMenu() {
    const { menuOpen } = this.state;
    if (!menuOpen) {
      return null;
    }

    const { translate } = this.context.language;
    const { self, type, stock, id } = this.state.opponent;
    return <div className='menu-list' onClick={(e) => e.stopPropagation()}>
      <div className='quad'>
        {Factory.getAllShipTypes().sort().map((shipType) =>
          <ul key={shipType} className='block'>
            {translate(shipType)}
            {/* Add stock build */}
            <li key={shipType}
              onClick={this._shipChange.bind(this, false, shipType, true)}
              className={cn({ selected: stock && type === shipType })}>
              {translate('stock')}
            </li>
            {Persist.getBuildsNamesFor(shipType).sort().map((storedId) =>
              <li key={`${shipType}-${storedId}`}
                onClick={this._shipChange.bind(this, false, shipType, false, storedId)}
                className={ cn({ selected: type === shipType && id === storedId })}>
                {storedId}
              </li>)}
            {/* Add ship itself */}
            {(this.props.ship.getShipType() === shipType ?
              <li key='self'
                onClick={this._shipChange.bind(this, true, shipType)}
                className={cn({ selected: self })}>
                {translate('THIS_SHIP')}
              </li>
              : null)}
          </ul>)}
      </div>
    </div>;
  }

  /**
   * Toggle the menu state
   */
  _toggleMenu() {
    const { menuOpen } = this.state;
    this.setState({ menuOpen: !menuOpen });
  }

  /**
   * Render picker
   * @return {React.Component} contents
   */
  render() {
    const { translate } = this.context.language;
    const { ship } = this.props;
    const { menuOpen } = this.state;
    const { self, type, stock, id } = this.state.opponent;

    let label;
    if (self) {
      label = translate('THIS_SHIP');
    } else if (stock) {
      label = translate('stock');
    } else {
      label = id;
    }

    return (
      <div className='shippicker' onClick={ (e) => e.stopPropagation() }>
        <div className='menu'>
          <div className={cn('menu-header', { selected: menuOpen })} onClick={this._toggleMenu}>
            <span><Rocket className='warning' /></span>
            <span className='menu-item-label'>
              {`${translate(type)}: ${label}`}
            </span>
          </div>
          {this._renderPickerMenu()}
        </div>
      </div>
    );
  }
}
