'use strict';

$(document).ready(function () {
  var vantage_settings = store.get('vantage');
  
  if (vantage_settings && vantage_settings['connect-2']) {

  } else {
    $("#vantage-callout").toggleClass('d-none');
  }

  $('.callout-close').click(function () {
    var vantage_settings = {'connect-2': true};
    store.set('vantage', vantage_settings);
    $("#vantage-callout").toggleClass('d-none');
  });
})
