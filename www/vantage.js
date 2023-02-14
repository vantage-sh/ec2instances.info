'use strict';

function vantage_settings() {
  var vantage_settings = store.get('vantage');
  if (vantage_settings) {
    if (vantage_settings['connect-1']) {
      $('.vantage-callout').hide();
    }
  } else {
    try {
      $('.callout-close').click(function () {
        var vantage_settings = {'connect-1': true};
        store.set('vantage', vantage_settings);
        $(this).parent().hide();
      });
    } catch (e) {
      console.log(e);
    }
  }
}
