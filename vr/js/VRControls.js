/**
/**
 * @author dmarcos / https://github.com/dmarcos
 * @author hawksley / https://github.com/hawksley (added support for many more forms of control)
 */

THREE.VRControls = function ( camera, speed, done ) {
	this.phoneVR = new PhoneVR();

	this.speed = speed || 1; // 3 is just a good default speed multiplier

	//---game controller stuff---
	this.haveEvents = 'ongamepadconnected' in window;
	this.controllers = {};

	this._camera = camera;

	this._init = function () {
		var self = this;

		//hold down keys to do rotations and stuff
		function key(event, sign) {
			var control = self.manualControls[event.keyCode];

			if (typeof control === 'undefined' || sign === 1 && control.active || sign === -1 && !control.active) {
				return;
			}

			control.active = (sign === 1);
			if (control.index <= 2){
				self.manualRotateRate[control.index] += sign * control.sign;
			} else if (control.index <= 5) {
				self.manualMoveRate[control.index - 3] += sign * control.sign;
			}
		}

		document.addEventListener('keydown', function(event) { key(event, 1); }, false);
		document.addEventListener('keyup', function(event) { key(event, -1); }, false);


		function connecthandler(e) {
			addgamepad(e.gamepad);
		}

		function addgamepad(gamepad) {
			self.controllers[gamepad.index] = gamepad;
		}

		function disconnecthandler(e) {
			removegamepad(e.gamepad);
		}

		function removegamepad(gamepad) {
			delete self.controllers[gamepad.index];
		}

		function scangamepads() {
			var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
			for (var i = 0; i < gamepads.length; i++) {
				var gamepad = gamepads[i];

				// only take gamepads with pose for this demo
				if (gamepad && gamepad.pose) {
					if (gamepad.index in self.controllers) {
						self.controllers[gamepad.index] = gamepad;
					} else {
						addgamepad(gamepad);
					}
		    }
	    }
		}

		window.addEventListener("gamepadconnected", connecthandler);
		window.addEventListener("gamepaddisconnected", disconnecthandler);
		if (!self.haveEvents) {
			setInterval(scangamepads, 20);
		}

		if (!navigator.getVRDisplays && !navigator.mozGetVRDevices && !navigator.getVRDevices) {
			return;
		}
		if (navigator.getVRDisplays) {
			navigator.getVRDisplays().then( gotVRDisplay );
		}else if ( navigator.getVRDevices ) {
			navigator.getVRDevices().then( gotVRDevices );
		} else {
			navigator.mozGetVRDevices( gotVRDevices );
		}

		function gotVRDisplay( devices) {
			var vrInput;
			var error;
			for ( var i = 0; i < devices.length; ++i ) {
				if ( devices[i] instanceof VRDisplay ) {
					vrInput = devices[i]
					self._vrInput = vrInput;
					break; // We keep the first we encounter
				}
			}
		}

		function gotVRDevices( devices ) {
			var vrInput;
			var error;
			for ( var i = 0; i < devices.length; ++i ) {
				if ( devices[i] instanceof PositionSensorVRDevice ) {
					vrInput = devices[i]
					self._vrInput = vrInput;
					break; // We keep the first we encounter
				}
			}
		}
	};

	this._init();

	this.manualRotation = new THREE.Quaternion();

	this.manualControls = {
		65 : {index: 1, sign: 1, active: 0},  // a
		68 : {index: 1, sign: -1, active: 0}, // d
		87 : {index: 0, sign: 1, active: 0},  // w
		83 : {index: 0, sign: -1, active: 0}, // s
		81 : {index: 2, sign: -1, active: 0}, // q
		69 : {index: 2, sign: 1, active: 0},  // e

		38 : {index: 3, sign: -1, active: 0},  // up
		40 : {index: 3, sign: 1, active: 0}, // down
		37 : {index: 4, sign: 1, active: 0}, // left
		39 : {index: 4, sign: -1, active: 0},   // right
		191 : {index: 5, sign: 1, active: 0}, // fwd slash
		222 : {index: 5, sign: -1, active: 0}   // single quote
  };

	this.manualRotateRate = new Float32Array([0, 0, 0]);
	this.manualMoveRate = new Float32Array([0, 0, 0]);
	this.updateTime = 0;

	this.scale = 1;

	this.update = function() {
		var camera = this._camera;
		var vrState = this.getVRState();
		var vrInput = this._vrInput;
		var manualRotation = this.manualRotation;
		var oldTime = this.updateTime;
		var newTime = Date.now();
		this.updateTime = newTime;

		var interval = (newTime - oldTime) * 0.001;
		var update = new THREE.Quaternion(this.manualRotateRate[0] * interval,
		                               this.manualRotateRate[1] * interval,
		                               this.manualRotateRate[2] * interval, 1.0);
		update.normalize();
		manualRotation.multiplyQuaternions(manualRotation, update);

		var offset = new THREE.Vector3();
		if (this.manualMoveRate[0] != 0 || this.manualMoveRate[1] != 0 || this.manualMoveRate[2] != 0){
				offset = getFwdVector().multiplyScalar( interval * this.speed * this.manualMoveRate[0])
						.add(getRightVector().multiplyScalar( interval * this.speed * this.manualMoveRate[1]))
						.add(getUpVector().multiplyScalar( interval * this.speed * this.manualMoveRate[2]));
		}

		if ( camera ) {
			if ( !vrState ) {
				camera.quaternion.copy(manualRotation);
				camera.position = camera.position.add(offset);
				return;
			}

			// Applies head rotation from sensors data.
			var totalRotation = new THREE.Quaternion();

      if (vrState !== null) {
					var vrStateRotation = new THREE.Quaternion(vrState.hmd.rotation[0], vrState.hmd.rotation[1], vrState.hmd.rotation[2], vrState.hmd.rotation[3]);
	        totalRotation.multiplyQuaternions(manualRotation, vrStateRotation);
      } else {
        	totalRotation = manualRotation;
      }

			camera.quaternion.copy(totalRotation);

			if (vrState.hmd.position !== null) {
				camera.position.copy( {x: vrState.hmd.position[0], y: vrState.hmd.position[1], z: vrState.hmd.position[2]} ).multiplyScalar( this.scale );
			}
		}
	};

	this.resetSensor = function() {
		var vrInput = this._vrInput;
		if (!vrInput) {
			return null;
		}
		vrInput.resetSensor();
	};

	this.getRotation = function() {
		if ( typeof vrState == "undefined" || !vrState ) {
			return this.manualRotation;
		}

		var totalRotation = new THREE.Quaternion();
		var state = vrState.hmd.rotation;
		if (vrState.hmd.rotation[0] !== 0 ||
				vrState.hmd.rotation[1] !== 0 ||
				vrState.hmd.rotation[2] !== 0 ||
				vrState.hmd.rotation[3] !== 0) {
				var vrStateRotation = new THREE.Quaternion(state[0], state[1], state[2], state[3]);
				totalRotation.multiplyQuaternions(manualRotation, vrStateRotation);
		} else {
				totalRotation = manualRotation;
		}

		return totalRotation;
	};

	this._defaultPosition = [0,1.5,-1];
	this.setDefaultPosition = function(position) {
		this._defaultPosition = position;
	}

	this.getVRState = function() {
		var vrInput = this._vrInput;
		var orientation;
		var position;
		var vrState;

		if ( vrInput ) {
			if (vrInput.getState !== undefined) {
				orientation	= vrInput.getState().orientation;
				orientation = [orientation.x, orientation.y, orientation.z, orientation.w];
				position = vrInput.getState().position;
				position = [position.x, position.y, position.z];
			} else {
				orientation	= vrInput.getPose().orientation;
				position = vrInput.getPose().position;
			}
		} else if (this.phoneVR.rotationQuat()) {
			orientation = this.phoneVR.rotationQuat();
			orientation = [orientation.x, orientation.y, orientation.z, orientation.w];
			position = this._defaultPosition;
		} else {
			return null;
		}

		if (orientation == null) {
			return null;
		}
		vrState = {
			hmd : {
				rotation : [
					orientation[0],
					orientation[1],
					orientation[2],
					orientation[3]
				],
				position : [
					position[0],
					position[1],
					position[2]
				]
			}
		};

		return vrState;
	};

	function getFwdVector() {
		return new THREE.Vector3(0,0,1).applyQuaternion(camera.quaternion);
	}

	function getRightVector() {
		return new THREE.Vector3(-1,0,0).applyQuaternion(camera.quaternion);
	}

	function getUpVector() {
		return new THREE.Vector3(0,-1,0).applyQuaternion(camera.quaternion);
	}
};
