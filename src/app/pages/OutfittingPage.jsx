import React from 'react';
// import Perf from 'react-addons-perf';
import { Ships } from 'coriolis-data/dist';
import cn from 'classnames';
import Page from './Page';
import Router from '../Router';
import Persist from '../stores/Persist';
import { Factory, Ship } from 'ed-forge';
import { OBJECT_EVENT } from 'ed-forge/lib/Ship';
import { toDetailedBuild } from '../shipyard/Serializer';
import { outfitURL } from '../utils/UrlGenerators';
import {
  FloppyDisk,
  Bin,
  Switch,
  Download,
  Reload,
  LinkIcon,
  ShoppingIcon,
  MatIcon,
  OrbisIcon
} from '../components/SvgIcons';
import ShipSummaryTable from '../components/ShipSummaryTable';
import StandardSlotSection from '../components/StandardSlotSection';
import HardpointSlotSection from '../components/HardpointSlotSection';
import InternalSlotSection from '../components/InternalSlotSection';
import UtilitySlotSection from '../components/UtilitySlotSection';
import OutfittingSubpages from '../components/OutfittingSubpages';
import ModalExport from '../components/ModalExport';
import ModalPermalink from '../components/ModalPermalink';
import ModalShoppingList from '../components/ModalShoppingList';
import ModalOrbis from '../components/ModalOrbis';
import autoBind from 'auto-bind';
import { assign } from 'lodash';

const SHOW_BY_DEFAULT = {
  'cabincapacity': true,
  'causticresistance': true,
  'explosiveresistance': true,
  'kineticresistance': true,
  'thermicresistance': true,
  'heatefficiency': true,
  'powercapacity': true,
  'integrity': true,
  'engineminimalmass': true,
  'engineoptimalmass': true,
  'enginemaximalmass': true,
  'engineoptperformance': true,
  'fsdoptimalmass': true,
  'maxfuel': true,
  'dronelifetime': true,
  'weaponscapacity': true,
  'weaponsrecharge': true,
  'systemscapacity': true,
  'systemsrecharge': true,
  'enginescapacity': true,
  'enginesrecharge': true,
  'range': true,
  'shieldgenmaximalmass': true,
  'shieldgenminimalmass': true,
  'shieldgenoptimalmass': true,
  'brokenregenrate': true,
  'regenrate': true,
  'shieldgenstrength': true,
  'ammomaximum': true,
  'afmrepaircapacity': true,
  'fsdinterdictorfacinglimit': true,
  'fuelscooprate': true,
  'bays': true,
  'rebuildsperbay': true,
  'maximumrange': true,
  'maxactivedrones': true,
  'refinerybins': true,
  'shieldbankduration': true,
  'shieldbankspinup': true,
  'shieldbankreinforcement': true,
  'defencemodifierhealthaddition': true,
  'protection': true,
  'dronehackingtime': true,
  'defencemodifiershieldaddition': true,
  'jumpboost': true,
  'damagepersecond': true,
  'damage': true,
  'energypersecond': true,
  'heatpersecond': true,
  'sustaineddamagepersecond': true,
  'damageperenergy': true,
  'rateoffire': true,
  'maximumrange': true,
  'damagefalloffrange': true,
  'armourpenetration': true,
  'sustainedenergypersecond': true,
  'sustainedheatpersecond': true,
  'ammoclipsize': true,
  'ammomaximum': true,
  'reloadtime': true,
  'shotspeed': true,
  'defencemodifiershieldmultiplier': true,
  'scannerrange': true,
  'scannertimetoscan': true,
  'maxangle': true,
  'mass': true,
};

/**
 * The Outfitting Page
 */
export default class OutfittingPage extends Page {
  /**
   * Constructor
   * @param  {Object} props   React Component properties
   * @param  {Object} context React Component context
   */
  constructor(props, context) {
    super(props, context);
    autoBind(this);
    this.state = this._initState(props, context);
  }

  /**
   * [Re]Create initial state from context
   * @param  {Object} props    React component properties
   * @param  {context} context React component context
   * @return {Object}          New state object
   */
  _initState(props, context) {
    let params = context.route.params;
    let shipId = params.ship;
    let buildName = params.bn;
    let savedCode = Persist.getBuild(shipId, buildName);
    let code = params.code || savedCode;
    // Create a new Ship instance
    const ship = code ? new Ship(code) : Factory.newShip(shipId);
    ship.on(OBJECT_EVENT, this._shipUpdated);

    return {
      error: null,
      costTab: Persist.getCostTab() || 'costs',
      buildName,
      newBuildName: buildName,
      ship,
      code: ship.compress(),
      savedCode,
      propsToShow: assign({}, SHOW_BY_DEFAULT),
    };
  }

  /**
   * Get this pages title for the browser.
   * @returns {string} Page title
   */
  _getTitle() {
    const { buildName } = this.state;
    const { translate } = this.context.language;
    return buildName || translate(this.ship.getShipType());
  }

  /**
   * Handle build name change and update state
   * @param  {SyntheticEvent} event React Event
   */
  _buildNameChange(event) {
    let stateChanges = {
      newBuildName: event.target.value
    };

    const { ship } = this.state;
    const shipId = ship.getShipType();
    if (Persist.hasBuild(shipId, stateChanges.newBuildName)) {
      stateChanges.savedCode = Persist.getBuild(
        shipId,
        stateChanges.newBuildName,
      );
    } else {
      stateChanges.savedCode = null;
    }

    this.setState(stateChanges);
  }

  /**
   * Update the control part of the route
   */
  _updateRoute() {
    const { ship } = this.state;
    const code = ship.compress();
    this._setRoute();
    this.setState({ code });
  }

  /**
   * Triggered when engagement range has been updated
   * @param {number} engagementRange the engagement range, in m
   */
  _engagementRangeUpdated(engagementRange) {
    this.setState({ engagementRange }, () =>
      this._updateRouteOnControlChange()
    );
  }

  _propToShowToggled(propertyName, newStatus) {
    const { propsToShow } = this.state;
    if (newStatus === propsToShow[propertyName]) {
      return;
    }

    if (newStatus) {
      propsToShow[propertyName] = true;
    } else {
      delete propsToShow[propertyName];
    }
    this.setState({ propsToShow: assign({}, propsToShow) });
  }

  /**
   * Save the current build
   */
  _saveBuild() {
    const { ship, buildName, newBuildName } = this.state;
    const shipId = ship.getShipType();

    // If this is a stock ship the code won't be set, so ensure that we have it
    const code = this.state.code || ship.compress();

    Persist.saveBuild(shipId, newBuildName, code);
    this._setRoute();

    this.setState({
      buildName: newBuildName,
      code,
      savedCode: code,
    });
  }

  /**
   * Rename the current build
   */
  _renameBuild() {
    const { code, buildName, newBuildName, ship } = this.state;
    const shipId = ship.getShipType();
    if (buildName != newBuildName && newBuildName.length) {
      Persist.deleteBuild(shipId, buildName);
      Persist.saveBuild(shipId, newBuildName, code);
      this._setRoute();
      this.setState({
        buildName: newBuildName,
        code,
        savedCode: code,
      });
    }
  }

  /**
   * Reload build from last save
   */
  _reloadBuild() {
    this.setState({ code: this.state.savedCode }, () => this._codeUpdated());
  }

  /**
   * Reset build to Stock/Factory defaults
   */
  _resetBuild() {
    let { ship } = this.state;
    // Rebuild ship
    ship = Factory.newShip(ship.getShipType());
    // Update state, and refresh the ship
    this.setState({ ship, code: undefined }, () => this._setRoute());
  }

  /**
   * Delete the build
   */
  _deleteBuild() {
    const { ship, buildName } = this.state;
    const shipId = ship.getShipType();
    Persist.deleteBuild(shipId, buildName);

    Router.go(outfitURL(shipId));
  }

  /**
   * Serialized and show the export modal
   */
  _exportBuild() {
    let translate = this.context.language.translate;
    let { buildName, ship } = this.state;
    this.context.showModal(
      <ModalExport
        title={(buildName || ship.name) + ' ' + translate('export')}
        description={translate('PHRASE_EXPORT_DESC')}
        data={toDetailedBuild(buildName, ship, ship.toString())}
      />
    );
  }

  /**
   * Called when the code for the ship has been updated, to synchronize the rest of the data
   */
  _codeUpdated() {
    this.setState(
      { ship: new Ship(this.state.code), },
      () => this._setRoute(),
    );
  }

  /**
   * Called when the ship has been updated, to set the code and then update accordingly
   */
  _shipUpdated() {
    let { ship } = this.state;
    const code = ship.compress();
    // Only update the state if this really has been updated
    if (this.state.code != code) {
      this.setState({ code }, () => this._setRoute());
    }
  }

  /**
   * Update the current route based on build
   * @param  {string} shipId    Ship Id
   * @param  {string} buildName Current build name
   * @param  {string} code      Serialized ship 'code'
   */
  _setRoute() {
    const { ship, code, buildName } = this.state;
    Router.replace(outfitURL(ship.getShipType(), code, buildName));
  }

  /**
   * Update state based on context changes
   * @param  {Object} nextProps   Incoming/Next properties
   * @param  {Object} nextContext Incoming/Next context
   */
  componentWillReceiveProps(nextProps, nextContext) {
    if (this.context.route !== nextContext.route) {
      // Only re-init state if the route has changed
      this.setState(this._initState(nextProps, nextContext));
    }
  }

  /**
   * Add listeners when about to mount
   */
  componentWillMount() {
    document.addEventListener('keydown', this._keyDown);
  }

  /**
   * Remove listeners on unmount
   */
  componentWillUnmount() {
    document.removeEventListener('keydown', this._keyDown);
  }

  /**
   * Generates the short URL
   */
  _genShortlink() {
    this.context.showModal(<ModalPermalink url={window.location.href} />);
  }

  /**
   * Generate Orbis link
   */
  _genOrbis() {
    const data = {};
    const ship = this.state.ship;
    ship.coriolisId = ship.id;
    data.coriolisShip = ship;
    data.url = window.location.href;
    data.title = this.state.buildName || ship.id;
    data.description = this.state.buildName || ship.id;
    data.ShipName = ship.id;
    data.Ship = ship.id;
    console.log(data);
    this.context.showModal(<ModalOrbis ship={data} />);
  }

  /**
   * Open up a window for EDDB with a shopping list of our components
   */
  _eddbShoppingList() {
    const ship = this.state.ship;

    const shipId = Ships[ship.id].eddbID;
    // Provide unique list of non-PP module EDDB IDs
    const modIds = ship.internal
      .concat(ship.bulkheads, ship.standard, ship.hardpoints)
      .filter(slot => slot !== null && slot.m !== null && !slot.m.pp)
      .map(slot => slot.m.eddbID)
      .filter((v, i, a) => a.indexOf(v) === i);

    // Open up the relevant URL
    window.open(
      'https://eddb.io/station?s=' + shipId + '&m=' + modIds.join(',')
    );
  }

  /**
   * Generates the shopping list
   */
  _genShoppingList() {
    this.context.showModal(<ModalShoppingList ship={this.state.ship} />);
  }

  /**
   * Handle Key Down
   * @param  {Event} e  Keyboard Event
   */
  _keyDown(e) {
    // .keyCode will eventually be replaced with .key
    switch (e.keyCode) {
      case 69: // 'e'
        if (e.ctrlKey || e.metaKey) {
          // CTRL/CMD + e
          e.preventDefault();
          this._exportBuild();
        }
        break;
    }
  }

  /**
   * Render the Page
   * @return {React.Component} The page contents
   */
  renderPage() {
    let { language, termtip, tooltip, sizeRatio } = this.context,
        { translate } = language,
        {
          ship,
          code,
          savedCode,
          buildName,
          newBuildName,
          propsToShow,
        } = this.state,
        hide = tooltip.bind(null, null),
        menu = this.props.currentMenu,
        canSave = (newBuildName || buildName) && code !== savedCode,
        canRename = buildName && newBuildName && buildName != newBuildName,
        canReload = savedCode && canSave;

    // const requirements = Ships[ship.id].requirements;
    // let requirementElements = [];
    // /**
    //  * Render the requirements for a ship / etc
    //  * @param {string} className Class names
    //  * @param {string} textKey The key for translating
    //  * @param {String} tooltipTextKey  Tooltip key
    //  */
    // function renderRequirement(className, textKey, tooltipTextKey) {
    //   if (textKey.startsWith('empire') || textKey.startsWith('federation')) {
    //     requirementElements.push(
    //       <div
    //         key={textKey}
    //         className={className}
    //         onMouseEnter={termtip.bind(null, tooltipTextKey)}
    //         onMouseLeave={hide}
    //       >
    //         <a
    //           href={
    //             textKey.startsWith('empire') ?
    //               'http://elite-dangerous.wikia.com/wiki/Empire/Ranks' :
    //               'http://elite-dangerous.wikia.com/wiki/Federation/Ranks'
    //           }
    //           target="_blank"
    //           rel="noopener"
    //         >
    //           {translate(textKey)}
    //         </a>
    //       </div>
    //     );
    //   } else {
    //     requirementElements.push(
    //       <div
    //         key={textKey}
    //         className={className}
    //         onMouseEnter={termtip.bind(null, tooltipTextKey)}
    //         onMouseLeave={hide}
    //       >
    //         {translate(textKey)}
    //       </div>
    //     );
    //   }
    // }

    // if (requirements) {
    //   requirements.federationRank &&
    //     renderRequirement(
    //       'federation',
    //       'federation rank ' + requirements.federationRank,
    //       'federation rank required'
    //     );
    //   requirements.empireRank &&
    //     renderRequirement(
    //       'empire',
    //       'empire rank ' + requirements.empireRank,
    //       'empire rank required'
    //     );
    //   requirements.horizons &&
    //     renderRequirement('horizons', 'horizons', 'horizons required');
    //   requirements.horizonsEarlyAdoption &&
    //     renderRequirement(
    //       'horizons',
    //       'horizons early adoption',
    //       'horizons early adoption required'
    //     );
    // }

    return (
      <div
        id="outfit"
        className={'page'}
        style={{ fontSize: sizeRatio * 0.9 + 'em' }}
      >
        <div id="overview">
          <h1>{ship.getShipType()}</h1>
          {/* <div id="requirements">{requirementElements}</div> */}
          <div id="build">
            <input
              value={newBuildName || ''}
              onChange={this._buildNameChange}
              placeholder={translate('Enter Name')}
              maxLength={50}
            />
            <button
              onClick={canSave && this._saveBuild}
              disabled={!canSave}
              onMouseOver={termtip.bind(null, 'save')}
              onMouseOut={hide}
            >
              <FloppyDisk className="lg" />
            </button>
            <button
              onClick={canRename && this._renameBuild}
              disabled={!canRename}
              onMouseOver={termtip.bind(null, 'rename')}
              onMouseOut={hide}
            >
              <span style={{ textTransform: 'none', fontSize: '1.8em' }}>
                a|
              </span>
            </button>
            <button
              onClick={canReload && this._reloadBuild}
              disabled={!canReload}
              onMouseOver={termtip.bind(null, 'reload')}
              onMouseOut={hide}
            >
              <Reload className="lg" />
            </button>
            <button
              className={'danger'}
              onClick={savedCode && this._deleteBuild}
              disabled={!savedCode}
              onMouseOver={termtip.bind(null, 'delete')}
              onMouseOut={hide}
            >
              <Bin className="lg" />
            </button>
            <button
              onClick={code && this._resetBuild}
              disabled={!code}
              onMouseOver={termtip.bind(null, 'reset')}
              onMouseOut={hide}
            >
              <Switch className="lg" />
            </button>
            <button
              onClick={buildName && this._exportBuild}
              disabled={!buildName}
              onMouseOver={termtip.bind(null, 'export')}
              onMouseOut={hide}
            >
              <Download className="lg" />
            </button>
            <button
              // onClick={this._eddbShoppingList}
              onMouseOver={termtip.bind(null, 'PHRASE_SHOPPING_LIST')}
              onMouseOut={hide}
            >
              <ShoppingIcon className="lg" />
            </button>
            <button
              onClick={this._genShortlink}
              onMouseOver={termtip.bind(null, 'shortlink')}
              onMouseOut={hide}
            >
              <LinkIcon className="lg" />
            </button>
            <button
              onClick={this._genOrbis}
              onMouseOver={termtip.bind(null, 'PHASE_UPLOAD_ORBIS')}
              onMouseOut={hide}
            >
              <OrbisIcon className="lg" />
            </button>
            <button
              // onClick={this._genShoppingList}
              onMouseOver={termtip.bind(null, 'PHRASE_SHOPPING_MATS')}
              onMouseOut={hide}
            >
              <MatIcon className="lg" />
            </button>
          </div>
        </div>

        {/* Main tables */}
        <ShipSummaryTable ship={ship} code={code} />
        <StandardSlotSection ship={ship} code={code} currentMenu={menu}
          propsToShow={propsToShow} onPropToggle={this._propToShowToggled} />
        <InternalSlotSection ship={ship} code={code} currentMenu={menu}
          propsToShow={propsToShow} onPropToggle={this._propToShowToggled} />
        <HardpointSlotSection ship={ship} code={code} currentMenu={menu}
          propsToShow={propsToShow} onPropToggle={this._propToShowToggled} />
        <UtilitySlotSection ship={ship} code={code} currentMenu={menu}
          propsToShow={propsToShow} onPropToggle={this._propToShowToggled} />

        {/* Tabbed subpages */}
        <OutfittingSubpages ship={ship} code={code} buildName={buildName} />
      </div>
    );
  }
}
