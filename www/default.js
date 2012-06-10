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
  },
  prices: {
    "us-east": {
        "m1.small":    { linux: 0.08,   windows: 0.115 },
        "m1.medium":   { linux: 0.16,   windows: 0.23  },
        "m1.large":    { linux: 0.32,   windows: 0.46  },
        "m1.xlarge":   { linux: 0.64,   windows: 0.92  },
        "t1.micro":    { linux: 0.02,   windows: 0.03  },
        "m2.xlarge":   { linux: 0.45,   windows: 0.57  },
        "m2.2xlarge":  { linux: 0.90,   windows: 1.14  },
        "m2.4xlarge":  { linux: 1.80,   windows: 2.28  },
        "c1.medium":   { linux: 0.165,  windows: 0.285 },
        "c1.xlarge":   { linux: 0.66,   windows: 1.14  },
        "cc1.4xlarge": { linux: 1.30,   windows: 1.61  },
        "cc2.8xlarge": { linux: 2.40,   windows: 2.97  },
        "cg1.4xlarge": { linux: 2.10,   windows: 2.60  }
    },
    "us-west-1": {
        "m1.small":    { linux: 0.09,   windows: 0.125 },
        "m1.medium":   { linux: 0.18,   windows: 0.25  },
        "m1.large":    { linux: 0.36,   windows: 0.5   },
        "m1.xlarge":   { linux: 0.72,   windows: 1     },
        "t1.micro":    { linux: 0.025,  windows: 0.035 },
        "m2.xlarge":   { linux: 0.506,  windows: 0.626 },
        "m2.2xlarge":  { linux: 1.012,  windows: 1.252 },
        "m2.4xlarge":  { linux: 2.024,  windows: 2.504 },
        "c1.medium":   { linux: 0.186,  windows: 0.306 },
        "c1.xlarge":   { linux: 0.744,  windows: 1.224 },
    },
    "us-west-2": {
        "m1.small":    { linux: 0.08,   windows: 0.115 },
        "m1.medium":   { linux: 0.16,   windows: 0.23  },
        "m1.large":    { linux: 0.32,   windows: 0.46  },
        "m1.xlarge":   { linux: 0.64,   windows: 0.92  },
        "t1.micro":    { linux: 0.02,   windows: 0.03  },
        "m2.xlarge":   { linux: 0.45,   windows: 0.57  },
        "m2.2xlarge":  { linux: 0.90,   windows: 1.14  },
        "m2.4xlarge":  { linux: 1.80,   windows: 2.28  },
        "c1.medium":   { linux: 0.165,  windows: 0.285 },
        "c1.xlarge":   { linux: 0.66,   windows: 1.14  },
    },
    "eu-west": {
        "m1.small":    { linux: 0.09,   windows: 0.115 },
        "m1.medium":   { linux: 0.18,   windows: 0.23  },
        "m1.large":    { linux: 0.36,   windows: 0.46  },
        "m1.xlarge":   { linux: 0.72,   windows: 0.92  },
        "t1.micro":    { linux: 0.025,  windows: 0.035 },
        "m2.xlarge":   { linux: 0.506,  windows: 0.570 },
        "m2.2xlarge":  { linux: 1.012,  windows: 1.140 },
        "m2.4xlarge":  { linux: 2.024,  windows: 2.280 },
        "c1.medium":   { linux: 0.186,  windows: 0.285 },
        "c1.xlarge":   { linux: 0.744,  windows: 1.140 },
    },
    "ap-southeast": {
        "m1.small":    { linux: 0.09,   windows: 0.115 },
        "m1.medium":   { linux: 0.18,   windows: 0.23  },
        "m1.large":    { linux: 0.36,   windows: 0.46  },
        "m1.xlarge":   { linux: 0.72,   windows: 0.92  },
        "t1.micro":    { linux: 0.025,  windows: 0.035 },
        "m2.xlarge":   { linux: 0.506,  windows: 0.570 },
        "m2.2xlarge":  { linux: 1.012,  windows: 1.140 },
        "m2.4xlarge":  { linux: 2.024,  windows: 2.280 },
        "c1.medium":   { linux: 0.186,  windows: 0.285 },
        "c1.xlarge":   { linux: 0.744,  windows: 1.140 },
    },
    "ap-northeast": {
        "m1.small":    { linux: 0.092,  windows: 0.115 },
        "m1.medium":   { linux: 0.184,  windows: 0.23  },
        "m1.large":    { linux: 0.368,  windows: 0.46  },
        "m1.xlarge":   { linux: 0.736,  windows: 0.92  },
        "t1.micro":    { linux: 0.027,  windows: 0.035 },
        "m2.xlarge":   { linux: 0.518,  windows: 0.570 },
        "m2.2xlarge":  { linux: 1.036,  windows: 1.140 },
        "m2.4xlarge":  { linux: 2.072,  windows: 2.280 },
        "c1.medium":   { linux: 0.190,  windows: 0.285 },
        "c1.xlarge":   { linux: 0.760,  windows: 1.140 },
    },
    "sa-east": {
        "m1.small":    { linux: 0.115,  windows: 0.150 },
        "m1.medium":   { linux: 0.23,   windows: 0.3   },
        "m1.large":    { linux: 0.46,   windows: 0.6   },
        "m1.xlarge":   { linux: 0.92,   windows: 1.2   },
        "t1.micro":    { linux: 0.027,  windows: 0.037 },
        "m2.xlarge":   { linux: 0.68,   windows: 0.8   },
        "m2.2xlarge":  { linux: 1.36,   windows: 1.6   },
        "m2.4xlarge":  { linux: 2.72,   windows: 3.2   },
        "c1.medium":   { linux: 0.23,   windows: 0.35  },
        "c1.xlarge":   { linux: 0.92,   windows: 1.4   },
    }
  }
}

function updatePrices() {
  var multiplier = ec2pricing.hour_multipliers[ec2pricing.cost_unit];
  var cost, node_type;
  $.each($('td.cost'), function(i, elem) {
    elem = $(elem);
    
    node_type = elem.parent().attr('api-name');
    if(ec2pricing.prices[ec2pricing.region][node_type]) {
      cost = ec2pricing.prices[ec2pricing.region][node_type][elem.attr('os-type')];
      
      if (ec2pricing.cost_unit != 'hour') {
        cost = (cost * multiplier).toFixed(2);
      }
      elem.text('$' + cost + ' per ' + ec2pricing.cost_unit);
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
