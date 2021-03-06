/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule TouchableNativeFeedback
 */
'use strict';

var PropTypes = require('ReactPropTypes');
var React = require('React');
var ReactNativeViewAttributes = require('ReactNativeViewAttributes');
var Touchable = require('Touchable');
var TouchableWithoutFeedback = require('TouchableWithoutFeedback');
var UIManager = require('UIManager');

var ensurePositiveDelayProps = require('ensurePositiveDelayProps');
var onlyChild = require('onlyChild');
var processColor = require('processColor');
var requireNativeComponent = require('requireNativeComponent');

var rippleBackgroundPropType = PropTypes.shape({
  type: React.PropTypes.oneOf(['RippleAndroid']),
  color: PropTypes.number,
  borderless: PropTypes.bool,
});

var themeAttributeBackgroundPropType = PropTypes.shape({
  type: React.PropTypes.oneOf(['ThemeAttrAndroid']),
  attribute: PropTypes.string.isRequired,
});

var backgroundPropType = PropTypes.oneOfType([
  rippleBackgroundPropType,
  themeAttributeBackgroundPropType,
]);

var TouchableView = requireNativeComponent('RCTView', null, {
  nativeOnly: {
    nativeBackgroundAndroid: backgroundPropType,
  }
});

var PRESS_RETENTION_OFFSET = {top: 20, left: 20, right: 20, bottom: 30};

/**
 * A wrapper for making views respond properly to touches (Android only).
 * On Android this component uses native state drawable to display touch
 * feedback. At the moment it only supports having a single View instance as a
 * child node, as it's implemented by replacing that View with another instance
 * of RCTView node with some additional properties set.
 *
 * Background drawable of native feedback touchable can be customized with
 * `background` property.
 *
 * Example:
 *
 * ```
 * renderButton: function() {
 *   return (
 *     <TouchableNativeFeedback
 *         onPress={this._onPressButton}
 *         background={TouchableNativeFeedback.SelectableBackground()}>
 *       <View style={{width: 150, height: 100, backgroundColor: 'red'}}>
 *         <Text style={{margin: 30}}>Button</Text>
 *       </View>
 *     </TouchableNativeFeedback>
 *   );
 * },
 * ```
 */

var TouchableNativeFeedback = React.createClass({
  propTypes: {
    ...TouchableWithoutFeedback.propTypes,

    /**
     * Determines the type of background drawable that's going to be used to
     * display feedback. It takes an object with `type` property and extra data
     * depending on the `type`. It's recommended to use one of the following
     * static methods to generate that dictionary:
     *
     * 1) TouchableNativeFeedback.SelectableBackground() - will create object
     * that represents android theme's default background for selectable
     * elements (?android:attr/selectableItemBackground)
     *
     * 2) TouchableNativeFeedback.SelectableBackgroundBorderless() - will create
     * object that represent android theme's default background for borderless
     * selectable elements (?android:attr/selectableItemBackgroundBorderless).
     * Available on android API level 21+
     *
     * 3) TouchableNativeFeedback.Ripple(color, borderless) - will create
     * object that represents ripple drawable with specified color (as a
     * string). If property `borderless` evaluates to true the ripple will
     * render outside of the view bounds (see native actionbar buttons as an
     * example of that behavior). This background type is available on Android
     * API level 21+
     */
    background: backgroundPropType,
  },

  statics: {
    SelectableBackground: function() {
      return {type: 'ThemeAttrAndroid', attribute: 'selectableItemBackground'};
    },
    SelectableBackgroundBorderless: function() {
      return {type: 'ThemeAttrAndroid', attribute: 'selectableItemBackgroundBorderless'};
    },
    Ripple: function(color, borderless) {
      return {type: 'RippleAndroid', color: processColor(color), borderless: borderless};
    },
  },

  mixins: [Touchable.Mixin],

  getDefaultProps: function() {
    return {
      background: this.SelectableBackground(),
    };
  },

  getInitialState: function() {
    return this.touchableGetInitialState();
  },

  componentDidMount: function() {
    ensurePositiveDelayProps(this.props);
  },

  componentWillReceiveProps: function(nextProps) {
    ensurePositiveDelayProps(nextProps);
  },

  /**
   * `Touchable.Mixin` self callbacks. The mixin will invoke these if they are
   * defined on your component.
   */
  touchableHandleActivePressIn: function() {
    this.props.onPressIn && this.props.onPressIn();
    this._dispatchPressedStateChange(true);
    this._dispatchHotspotUpdate(this.pressInLocation.locationX, this.pressInLocation.locationY);
  },

  touchableHandleActivePressOut: function() {
    this.props.onPressOut && this.props.onPressOut();
    this._dispatchPressedStateChange(false);
  },

  touchableHandlePress: function() {
    this.props.onPress && this.props.onPress();
  },

  touchableHandleLongPress: function() {
    this.props.onLongPress && this.props.onLongPress();
  },

  touchableGetPressRectOffset: function() {
    // Always make sure to predeclare a constant!
    return this.props.pressRetentionOffset || PRESS_RETENTION_OFFSET;
  },

  touchableGetHitSlop: function() {
    return this.props.hitSlop;
  },

  touchableGetHighlightDelayMS: function() {
    return this.props.delayPressIn;
  },

  touchableGetLongPressDelayMS: function() {
    return this.props.delayLongPress;
  },

  touchableGetPressOutDelayMS: function() {
    return this.props.delayPressOut;
  },

  _handleResponderMove: function(e) {
    this.touchableHandleResponderMove(e);
    this._dispatchHotspotUpdate(e.nativeEvent.pageX, e.nativeEvent.pageY);
  },

  _dispatchHotspotUpdate: function(destX, destY) {
    UIManager.dispatchViewManagerCommand(
      React.findNodeHandle(this),
      UIManager.RCTView.Commands.hotspotUpdate,
      [destX || 0, destY || 0]
    );
  },

  _dispatchPressedStateChange: function(pressed) {
    UIManager.dispatchViewManagerCommand(
      React.findNodeHandle(this),
      UIManager.RCTView.Commands.setPressed,
      [pressed]
    );
  },

  render: function() {
    var childProps = {
      ...onlyChild(this.props.children).props,
      nativeBackgroundAndroid: this.props.background,
      accessible: this.props.accessible !== false,
      accessibilityLabel: this.props.accessibilityLabel,
      accessibilityComponentType: this.props.accessibilityComponentType,
      accessibilityTraits: this.props.accessibilityTraits,
      testID: this.props.testID,
      onLayout: this.props.onLayout,
      hitSlop: this.props.hitSlop,
      onStartShouldSetResponder: this.touchableHandleStartShouldSetResponder,
      onResponderTerminationRequest: this.touchableHandleResponderTerminationRequest,
      onResponderGrant: this.touchableHandleResponderGrant,
      onResponderMove: this._handleResponderMove,
      onResponderRelease: this.touchableHandleResponderRelease,
      onResponderTerminate: this.touchableHandleResponderTerminate,
    };
    return <TouchableView {...childProps}/>;
  }
});

module.exports = TouchableNativeFeedback;
