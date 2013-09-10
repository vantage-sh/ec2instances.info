// Costing factors.
// @see update_cost.
var current_cost_duration = null;
var current_region = null;

// Regions and their cost multiplier.
var regions = {
  "us-east" : {
    "name" : "US East",
    "multiplier" : 1
  },
  "eu-west" : {
    "name" : "EU West",
    "multiplier" : 1.08
  }
}

// Cost multiplers against hourly costs.
var hour_multipliers = {
  "hourly": 1,
  "daily": 24,
  "weekly": (7*24),
  "monthly": (24*30),
  "yearly": (365*24)
};

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
  // Update the current costing duration and update the costs.
  current_cost_duration = duration;
  update_cost();
}

/**
 * Callback for change of "Region" dropdown.
 */
function change_region(elem) {
  // Get the region name.
  current_region = $('a', elem).attr('region');
  // Highlight the chosen region.
  $('#region-dropdown li').removeClass('active');
  $(elem).addClass('active');
  // Change region name text displayed to the user.
  $(region_text).text(regions[current_region].name);
  // Go ahead and update the table.
  update_cost();
}

/**
 * Update the cost in the table, based on the following factors:
 *  - period: hourly, daily, weekly, monthly.
 *  - region: US East, US West, etc.
 */
function update_cost() {
  // Multipler based on selected time.
  var time_factor = hour_multipliers[current_cost_duration];
  // Multiplier based on selected region.
  var region_factor = regions[current_region].multiplier;
  // Per-cell hourly cost, for use in the loop.
  var base_hourly_cost, cost = 0;

  // Iterate through the table, updating the cost.
  $('td.cost').each(function(index) {
    var cell = $(this);
    // Base costs are provided hourly - use this as the basis for calculations,
    base_hourly_cost = cell.attr('hour_cost');
    cost = base_hourly_cost * time_factor * region_factor;
    //console.log('Base cost: ' + base_hourly_cost + ' Cost: ' + cost);
    cell.text('$' + cost.toFixed(2) + ' ' + current_cost_duration);
  });
}

function setup_column_toggle() {
  // get column headings, add to filter button
  $.each($("#data thead tr th"), function(i, elem) {
    $("#filter-dropdown ul").append(
      $('<li>', {class: "active"}).append(
        $('<a>', {href: "javascript:;"})
          .text($(elem).text())
          .click(function(e) {
            toggle_column(i);
            $(this).parent().toggleClass("active");
            $(this).blur(); // prevent focus style from sticking in Firefox
            e.stopPropagation(); // keep dropdown menu open
          })
      )
    );
  });
}

$(function() {
  $(document).ready(function() {
    $('#data').dataTable({
      "bPaginate": false,
      "bInfo": false,
      "bStateSave": true,
      "oSearch": {
        "bRegex" : true,
        "bSmart": false
      },
      "aoColumnDefs": [
        {
          "aTargets": ["memory", "computeunits", "storage", "ioperf"],
          "sType": "span-sort"
        }
      ],
      // default sort by linux cost
      "aaSorting": [
        [ 8, "asc" ]
      ],
      "fnDrawCallback": function() {
        // Whenever the table is drawn, update the costs. This is necessary
        // because the cost duration may have changed while a filter was being
        // used and so some rows will need updating.
        change_cost(current_cost_duration);
      }
    });
  });

  $.extend($.fn.dataTableExt.oStdClasses, {
    "sWrapper": "dataTables_wrapper form-inline"
  });

  // Set up some defaults for costings. @todo - Cookie these for users.
  current_cost_duration = 'hourly';
  current_region = 'us-east';
  // Update the table.
  update_cost();

  setup_column_toggle();

  // enable bootstrap tooltips
  $('abbr').tooltip({ 
    placement: function(tt, el) { 
      return (this.$element.parents('thead').length) ? 'top' : 'right';
    }
  });
});

$("#cost-dropdown li").bind("click", function(e) {
  change_cost(e.target.getAttribute("duration"));
});

// Change the region on click.
$('#region-dropdown li').on("click", function(){change_region(this)});

// Create a reference to the region text element.
var region_text = $('#region-dropdown span.region-name');

// sorting for colums with more complex data
// http://datatables.net/plug-ins/sorting#hidden_title
jQuery.extend(jQuery.fn.dataTableExt.oSort, {
  "span-sort-pre": function(elem) {
    var matches = elem.match(/sort="(.*?)"/);
    if (matches) {
      return parseInt(matches[1], 10);
    }
    return 0;
  },

  "span-sort-asc": function(a, b) {
    return ((a < b) ? -1 : ((a > b) ? 1 : 0));
  },

  "span-sort-desc": function(a, b) {
    return ((a < b) ? 1 : ((a > b) ? -1 : 0));
  }
});

// toggle columns
function toggle_column(col_index) {
  var table = $('#data').dataTable();
  var is_visible = table.fnSettings().aoColumns[col_index].bVisible;
  table.fnSetColumnVis(col_index, is_visible ? false : true);
}