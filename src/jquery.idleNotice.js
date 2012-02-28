/* jQuery idleNotice Widget 1.0-pre by Jacob Morrison
 * http://projects.ofjacob.com
 *
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
*/

(function($){

  $.widget("jom.idleNotice", {
	_localTimeDiff: null,
	_lockCountdown: null,
	_keepAliveAjax: null,
	_expireDialogId: null,
	_warningDialogId: null,
	_warningTimeId: null,
	
    options: {
    	'loadTime': null,		/* Server's unix time at page load */
    	'expireTime': null,		/* Unix time (server) until expiration */
    	'expireWarning': 60, 	/* Seconds to warn before expiration */
    	'stayActiveAjax': {
			'url': null,    	/* URL to ping to keep session active */
			'notify': true,
			'notifyMessage': 'Attempting to keep session...',
    	},
    	'onExpire': null,		/* What to do when session expires */
    	'warningDialog': {
    		'title': 'Session Expiration Notice',
    		'modal': true, 
    		'width': '400px', 
    		'position': 'top',
    		'draggable': false,
    		'resizable': false,
    		'content': "You will be logged out in #{time}. Do you want to stay logged in and continue on this screen?",		/* Notice to show before expiration */
    		'buttons': {
    			'Stay Logged In': function() { $(document).trigger("stayActive"); }
    		}
    	},
    	'expireDialog': {
    		'title': 'Session Has Expired',
    		'modal': true, 
    		'width': '400px', 
    		'position': 'top',
    		'draggable': false,
    		'resizable': false,
    		'content': "You have been logged out due to inactivity.",		/* Notice to show before expiration */
    		'buttons': {
    			'Log Back In': "function() { window.location.reload(); }"
    		},
    	},
    	
    },

    _create: function(){
    	var self = this;
    	var mDate = new Date();
    	
    	/* figure out how far off this computer is from server */
		this._localTimeDiff = Math.floor(mDate.getTime() / 1000) - this.options.loadTime;
		
      	/* come up with IDs */
      	this._expireDialogId = "jom-idleNotice-expire-"+mDate.getTime();
      	this._warningDialogId = "jom-idleNotice-warning-"+mDate.getTime();
      	this._warningTimeId = "jom-idleNotice-time-"+mDate.getTime();
      	
      	/* make and set up my dialogs */
      	var params = {'time': '<span style="font-weight:bold;" id="'+this._warningTimeId+'"></span>'};
    	this.options.warningDialog.content = this.options.warningDialog.content.replace(/#(?:\{|%7B)(.*?)(?:\}|%7D)/g, function($1, $2){
        	return ($2 in params) ? params[$2] : '';
      	});
      	$("body").append("<div id='"+this._expireDialogId+"'>"+this.options.expireDialog.content+"</div>");
      	$("body").append("<div id='"+this._warningDialogId+"'>"+this.options.warningDialog.content+"</div>");
      	
      	this.options.expireDialog.autoOpen = false;
      	this.options.expireDialog.beforeClose = function() { return false; }
      	this.options.warningDialog.autoOpen = false;
      	$("#"+this._expireDialogId).dialog(this.options.expireDialog);
      	$("#"+this._warningDialogId).dialog(this.options.warningDialog);
      	
      	/* set up my stayActive trigger */
      	$(document).bind("stayActive", function() {
			$("#"+self._warningDialogId).dialog("close");
      		if(self.options.stayActiveAjax.url) {
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
      	
      	/* start the timer! */
		this._lockCountdown = setInterval(function() { self._countdown(); }, 1000);
    },
	
	/* Function that counts down and opens dialog */
	_countdown: function() {
		var mDate = new Date();
		var diff = this.options.expireTime - Math.floor(mDate.getTime() / 1000) + this._localTimeDiff;
		if (diff > 0) { /* we haven't expired yet */
			$("#"+this._warningTimeId).html(this._formatSeconds(diff));
			if(!this._keepAliveAjax && diff < this.options.expireWarning && !$("#"+this._warningDialogId).dialog("isOpen")) {
				$("#"+this._warningDialogId).dialog("open");
				$("#"+this._warningDialogId).parent('.ui-dialog').find(".ui-dialog-titlebar-close").remove();
			}
		} else { /* we've expired */
			$("#"+this._warningDialogId).dialog("close");
			if(!$("#"+this._expireDialogId).dialog("isOpen")) {
				$("#"+this._expireDialogId).parent('.ui-dialog').find(".ui-dialog-titlebar-close").remove();
				$("#"+this._expireDialogId).dialog("open");
			}
			/* just stop. stop counting down. */
			clearInterval(this._lockCountdown);
		}
	},
	
	/* Helper function to format time left */
	_formatSeconds: function(seconds) {
		var minVar = Math.floor(seconds/60);
		var secVar = (seconds % 60);
		if(minVar > 0) {
			return minVar + " minutes and " + secVar + " seconds";
		} else {
			return secVar + " seconds";
		}
	},
  });
})(jQuery);
