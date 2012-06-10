// add parser through the tablesorter addParser method 
$.tablesorter.addParser({ 
    // set a unique id 
    id: 'ioperf', 
    is: function(s) { return false; }, 
    format: function(s) { 
        // format your data for normalization 
        if (s == 'Low') {
          return 0;
        } else if (s == 'Moderate') {
          return 1;
        } else if (s == 'High') {
          return 2;
        } else {
          return 3;
        }
    }, 
    // set type, either numeric or text 
    type: 'numeric' 
});

$(function() {
  $('.tablesorter').tablesorter({
    headers: {
      /* memory */
      1: {
        sorter: 'digit'
      },
      /* compute units */
      2: {
        sorter: 'digit'
      },
      /* storage */
      3: {
        sorter: 'digit'
      },
      /* i/o perf */
      5: {
        sorter: 'ioperf'
      }
    },
    // sortList: [[0,1]],
    widgets: ['zebra']
  });
});

// set up on-load defaults and lookup tables
window.ec2pricing = {
  cost_unit: 'hour',
  region: 'us_east',
  hour_multipliers: {
    hour: 1,
    day: 24,
    week: (7*24),
    month: (24*30),
    year: (365*24)
  }
}

function updatePrices() {
  var multiplier = ec2pricing.hour_multipliers[ec2pricing.cost_unit];
  var per_hour, per_time;
  $.each($('td.cost'), function(i, elem) {
    elem = $(elem);
    per_time = elem.attr(ec2pricing.region);
    if(per_time) {
      if (ec2pricing.cost_unit != 'hour') {
        per_time = (per_time * multiplier).toFixed(2);
      }
      elem.text('$' + per_time + ' per ' + ec2pricing.cost_unit);
      elem.parent().removeClass('unavailable');
    } else {
      elem.text('N/A');
      elem.parent().addClass('unavailable');
    }
    
  });
};

$('#cost').bind('change', function(e) {
  ec2pricing.cost_unit = $('#cost option:selected').val();
  updatePrices();
});

$('#region').bind('change', function(e) {
  ec2pricing.region = $('#region option:selected').val();
  updatePrices();
});
