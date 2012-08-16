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

$('#cost').bind('change', function(e) {
  var selected = $('#cost option:selected').val();
  var hour_multipliers = {
    'hour': 1,
    'day': 24,
    'week': (7*24),
    'month': (24*30),
    'year': (365*24)
  };
  var multiplier = hour_multipliers[selected];
  var per_hour;
  var per_time;
  $.each($('td.cost'), function(i, elem) {
    elem = $(elem);
    per_time = elem.attr('hour_cost');
    if (selected != 'hour') {
      per_time = (per_time * multiplier).toFixed(2);
    }
    elem.text('$' + per_time + ' per ' + selected);
  });
});

/* Add Facility to filter the list of instance types */
$(function(){
  var ids = $('.tablesorter tbody tr').map(
    function(){
      return {
        id:$(this).attr('id')||"",
        name:$(this).children('td').first().text()||""
      };
    }
  );
  var types = $("<select  multiple='multiple'></select>");
  $.each(
    ids,function(i,el){
      types.append(tim('<option value="{{id}}">{{name}}</option>',el));
    }
  );
  $('#selectors').append(types);
  $('#selectors').change(function(){
    $('.tablesorter tbody tr').hide();
    types.find('option:selected').each(function(){
      var selected = $(this).val();
      $('#'+selected).show();
    });
  });
});
