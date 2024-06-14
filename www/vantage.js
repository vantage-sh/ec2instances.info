'use strict';

const redirectUrls = [
  "https://instances.vantage.sh/#1",
  "https://instances.vantage.sh/#2",
  "https://instances.vantage.sh/#3",
]

document.location = redirectUrls[Math.floor(Math.random() * redirectUrls.length)]

$(document).ready(function () {
  var vantage_settings = store.get('vantage');
  
  if (vantage_settings) {
    if (vantage_settings['connect-2']) {
      $('.vantage-callout').hide();
    }
  }

  $('.callout-close').click(function () {
    var vantage_settings = {'connect-2': true};
    store.set('vantage', vantage_settings);
    $(this).parent().hide();
  });
})
