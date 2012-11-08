/* jQuery idleNotice Widget 1.0-pre by Jacob Morrison
 * http://projects.ofjacob.com
 *
 * Licensed under the MIT license:
 *   http://www.opensource.org/licenses/mit-license.php
*/

(function($){

  $.widget("jom.idleNotice", {
	_localTimeDiff: null,
	_lockCountdown: null,
	_keepAliveAjax: null,
	_checkActiveCountdown: null,
	_checkActiveAjax: null,
	_expiredDialogId: null,
	_warningDialogId: null,
	_warningTimeId: null,

    options: {
    	'loadTime': null,		/* Server's unix time at page load */
    	'expireTime': null,		/* Unix time (server) until expiration */
    	'expireWarning': 60, 	/* Seconds to warn before expiration */
    	'stayActiveAjax': {
    		'url': null,    	/* URL to ping to keep session active */
    		'notify': true,
    		'notifyMessage': 'Attempting to keep session...'
    	},
    	'checkActiveInterval': 5,
    	'checkActiveAjax': {
  			'url': null,    	/* URL to ping to update session expire time */
  			'notify': false
    	},
    	'onExpire': null,		/* What to do when session expires */
    	'warningDialog': {
    		'title': 'Session Expiration Notice',
    		'modal': true,
    		'width': '400px',
    		'position': 'top',
    		'draggable': false,
    		'resizable': false,
    		'zIndex': 100000,
    		'content': "You will be logged out in #{time}. Do you want to stay logged in and continue on this screen?",		/* Notice to show before expiration */
    		'buttons': {
    			'Stay Logged In': function() { $(document).trigger("stayActive"); }
    		}
    	},
    	'expiredDialog': {
    		'title': 'Session Has Expired',
    		'modal': true,
    		'width': '400px',
    		'position': 'top',
    		'draggable': false,
    		'resizable': false,
    		'zIndex': 100000,
    		'content': "You have been logged out due to inactivity.",		/* Notice to show before expiration */
    		'buttons': {
    			'Log Back In': "function() { window.location.reload(); }"
    		}
    	}
    },

    _create: function(){
    	var self = this;
    	var mDate = new Date();
    	if (this.options.loadTime == null || this.options.expireTime == null) {
    		return false;
    	}
    	/* figure out how far off this computer is from server */
		this._localTimeDiff = Math.floor(mDate.getTime() / 1000) - this.options.loadTime;

      	/* come up with IDs */
      	this._expiredDialogId = "jom-idleNotice-expire-"+mDate.getTime();
      	this._warningDialogId = "jom-idleNotice-warning-"+mDate.getTime();
      	this._warningTimeId = "jom-idleNotice-time-"+mDate.getTime();

      	/* make and set up my dialogs */
      	var params = {'time': '<span style="font-weight:bold;" id="'+this._warningTimeId+'"></span>'};
    	this.options.warningDialog.content = this.options.warningDialog.content.replace(/#(?:\{|%7B)(.*?)(?:\}|%7D)/g, function($1, $2){
        	return ($2 in params) ? params[$2] : '';
      	});
      	$("body").append("<div id='"+this._expiredDialogId+"'>"+this.options.expiredDialog.content+"</div>");
      	$("body").append("<div id='"+this._warningDialogId+"'>"+this.options.warningDialog.content+"</div>");

      	this.options.expiredDialog.autoOpen = false;
      	this.options.expiredDialog.beforeClose = function() { return false; }
      	this.options.warningDialog.autoOpen = false;
      	$("#"+this._expiredDialogId).dialog(this.options.expiredDialog);
      	$("#"+this._warningDialogId).dialog(this.options.warningDialog);

      	/* set up my stayActive trigger */
      	$(document).bind("stayActive", function() {
			$("#"+self._warningDialogId).dialog("close");
			clearInterval(self._checkActiveCountdown);
			self._checkActiveCountdown = null;
      		if (self.options.stayActiveAjax.url) {
      			self.options.stayActiveAjax.success = function(data) {
      				if (data.success) {
    					var mDate = new Date();
						self.options.loadTime = data.current;
						self.options.expireTime = data.expire;
						self._localTimeDiff = Math.floor(mDate.getTime() / 1000) - self.options.loadTime;
						self._keepAliveAjax = null;
      				}
      			};
      			self._keepAliveAjax = $.ajax(self.options.stayActiveAjax);
      		}
      	});

      	/* set up my checkActive trigger */
      	$(document).bind("checkActive", function() {
      		if (self.options.checkActiveAjax.url) {
      			self.options.checkActiveAjax.success = function(data) {
      				if (data.current && data.expire) {
    					var mDate = new Date();
						self.options.loadTime = data.current;
						if (self.options.expireTime != data.expire) {
							/*console.log("Updated expire to: "+ self.options.expireTime);*/
							self.options.expireTime = data.expire;
						}
						self._localTimeDiff = Math.floor(mDate.getTime() / 1000) - self.options.loadTime;
						var diff = self.options.expireTime - Math.floor(mDate.getTime() / 1000) + self._localTimeDiff;
						if (!self._keepAliveAjax && diff < self.options.expireWarning && !$("#"+self._warningDialogId).dialog("isOpen")) {
							$("#"+self._warningDialogId).dialog("open");
							$("#"+self._warningDialogId).parent('.ui-dialog').find(".ui-dialog-titlebar-close").remove();
						} else if(diff > self.options.expireWarning) {
							$("#"+self._warningDialogId).dialog("close");
							clearInterval(self._checkActiveCountdown);
							self._checkActiveCountdown = null;
						}
      				}
					self._checkActiveAjax = null;
      			};
      			if (self._checkActiveAjax == null) {
      				self._checkActiveAjax = $.ajax(self.options.checkActiveAjax);
      			}
      		}
      	});

      	/* start the timers! */

		this._lockCountdown = setInterval(function() { self._countdown(); }, 1000);
    },

	/* Function that counts down and opens dialog */
	_countdown: function() {
		var mDate = new Date();
		var diff = this.options.expireTime - Math.floor(mDate.getTime() / 1000) + this._localTimeDiff;
		if (diff > 0) { /* we haven't expired yet */
			$("#"+this._warningTimeId).html(this._formatSeconds(diff));
			if (!this._keepAliveAjax && diff < this.options.expireWarning && !$("#"+this._warningDialogId).dialog("isOpen")) {
				if (this._checkActiveCountdown == null && this.options.checkActiveAjax.url) { /* if we're using checkActive, we'll let that control the warnings */
					$(document).trigger("checkActive");
					this._checkActiveCountdown = setInterval(function() { $(document).trigger("checkActive"); }, this.options.checkActiveInterval * 1000);
				} else if(!this.options.checkActiveAjax.url) { /* otherwise we'll do it */
					$("#"+this._warningDialogId).dialog("open");
					$("#"+this._warningDialogId).parent('.ui-dialog').find(".ui-dialog-titlebar-close").remove();
				}
			}

		} else { /* we've expired */
			$("#"+this._warningDialogId).dialog("close");
			if (!$("#"+this._expiredDialogId).dialog("isOpen")) {
				$("#"+this._expiredDialogId).parent('.ui-dialog').find(".ui-dialog-titlebar-close").remove();
				$("#"+this._expiredDialogId).dialog("open");
			}
			/* just stop. stop counting down. */
			clearInterval(this._lockCountdown);
			this._lockCountdown = null;
			clearInterval(this._checkActiveCountdown);
			this._checkActiveCountdown = null;
		}
	},

	/* Helper function to format time left */
	_formatSeconds: function(seconds) {
		var minVar = Math.floor(seconds/60);
		var secVar = (seconds % 60);
		if (minVar > 0) {
			return minVar + " minutes and " + secVar + " seconds";
		} else {
			return secVar + " seconds";
		}
	}
  });
})(jQuery);
