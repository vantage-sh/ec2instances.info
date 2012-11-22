function change_cost(duration) {
  // update menu text
  var first = duration.charAt(0).toUpperCase();
  var text = first + duration.substr(1);
  $("#cost-dropdown .dropdown-toggle .text").text("Cost: "+text);

  // update selected menu option
  $('#cost-dropdown li a').each(function(i, e) {
    e = $(e);
    if (e.attr('duration') == duration) {
      e.parent().addClass('active');
    } else {
      e.parent().removeClass('active');
    }
  });

  var hour_multipliers = {
    "hourly": 1,
    "daily": 24,
    "weekly": (7*24),
    "monthly": (24*30),
    "yearly": (365*24)
  };
  var multiplier = hour_multipliers[duration];
  var per_time;
  $.each($("td.cost"), function(i, elem) {
    elem = $(elem);
    per_time = elem.attr("hour_cost");
    per_time = (per_time * multiplier).toFixed(2);
    elem.text("$" + per_time + " " + duration);
  });

}

// add parser through the tablesorter addParser method 
$.tablesorter.addParser({ 
    // set a unique id 
    id: "ioperf", 
    is: function(s) { return false; }, 
    format: function(s) { 
        // format your data for normalization 
        if (s == "Low") {
          return 0;
        } else if (s == "Moderate") {
          return 1;
        } else if (s == "High") {
          return 2;
        } else {
          return 3;
        }
    }, 
    // set type, either numeric or text 
    type: "numeric" 
});

$(function() {
  $(".tablesorter").tablesorter({
    headers: {
      /* memory */
      1: {
        sorter: "digit"
      },
      /* compute units */
      2: {
        sorter: "digit"
      },
      /* storage */
      3: {
        sorter: "digit"
      },
      /* i/o perf */
      5: {
        sorter: "ioperf"
      }
    },
    // sortList: [[0,1]],
    widgets: ["zebra"]
  });
  
  change_cost('hourly');
});

$("#cost-dropdown li").bind("click", function(e) {
  change_cost(e.target.getAttribute("duration"));
});
