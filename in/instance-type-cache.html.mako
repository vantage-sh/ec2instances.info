<!DOCTYPE html>

<html lang="en">
  <head>
    <meta charset="UTF-8">
    <!-- Google Tag Manager -->
    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','GTM-TBZCV32');</script>
    <!-- End Google Tag Manager -->
    <link rel="stylesheet" href="/default.css" media="screen">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/css/bootstrap.min.css" rel="stylesheet" crossorigin="anonymous">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons"
      rel="stylesheet">
    <link rel="stylesheet" href="/style.css">
    <link rel="icon" type="image/png" href="/favicon.png">
    <title>${i["Amazon"][1]["value"]} pricing and specs - Vantage</title>
    <meta name="description" content="${description}">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  </head>
    
  <body>
    <div class="main">
      <div class="nav">
        <div class="logo-group me-md-3 me-0 align-items-center">
          <div class="d-flex align-items-center gap-2">
            <a href="/" class="logo">
              <img width="28" height="28" alt="Vantage Logo" src="/vantage-logo-icon.svg">
            </a>
            <div class="d-flex flex-column">
              <p class="fs-6 fw-semibold text-white mb-0">Instances</p>
              <a href="https://www.vantage.sh/?utm_campaign=Instances%20Blog%20Clicks&utm_source=presented-by" target="_blank" class="text-decoration-none text-white mb-0 opacity-75" style="font-size: 12px;">Presented by Vantage</a>
            </div>
          </div>
          <a href="https://github.com/vantage-sh/ec2instances.info" class="btn btn-github btn-icon contr-mobile">
            <img src="/icon-github.svg" height="18" width="18" class="me-1" />
            Star
          </a>
        </div>
        <div class="d-flex">
          <div class="nav-buttons px-2 d-none d-xxl-block">
            <a target="_blank" href="https://vantage.sh/slack" class="btn btn-github btn-icon">
              <img src="/icon-slack.svg" height="18" width="18" class="me-1" />
              Slack
            </a>
          </div>
          <div class="nav-buttons d-none d-xxl-block">
            <a target="_black" href="https://github.com/vantage-sh/ec2instances.info" class="btn btn-github btn-icon">
              <img src="/icon-github.svg" height="18" width="18" class="me-1" />
              Star
            </a>
          </div>
        </div>
      </div>
      <%include file="ads-banner.mako"/>
      <div class="columns">
        <div class="column-left--parent justify-content-center">
          <div class="column-left">
            <h1 class="h3 mb-0 fw-bolder">${i["Amazon"][1]["value"]}</h1>
            
            <!-- Description -->
            <p class="py-md-4 py-3 mb-2 small lh-base">${description}</p>
            
            <div class="d-flex align-items-center mb-3">
              <span class="material-icons me-1">paid</span>
              <p class="h6 fw-semibold mb-0">Pricing</p>
            </div>
            <!-- Prices -->
            <div class="small d-flex flex-row flex-wrap pe-2 mb-4">
              <div class="col-md-4 col-6 mb-md-0 mb-3">
                <p class="h6 mb-0 fw-semibold" id="p_od"></p>
                <p class="mb-0 fs-12 text-muted">On Demand</p>
              </div>
              <div class="col-md-4 col-6">
                <p class="h6 mb-0 fw-semibold" id="p_1yr"></p>
                <p class="mb-0 fs-12 text-muted">1 Yr Reserved</p>
              </div>
              <div class="col-md-4 col-6">
                <p class="h6 mb-0 fw-semibold" id="p_3yr"></p>
                <p class="mb-0 fs-12 text-muted">3 Yr Reserved</p>
              </div>
            </div>

            <!-- price Selects -->
            <div class="d-flex flex-wrap mt-2">
              <div class="col-6 pe-2 mb-2">
                <select class="form-select form-select-sm" id="region">
                  <!-- TODO: Localize default option order -->
                  <option value='us-east-1'>US East (N. Virginia)</option>
                  % for api_name, region in regions.items():
                    % if api_name == 'us-east-1':
                      <% continue %>
                    % endif
                    <option value='${api_name}'>${region}</option>
                  % endfor
                </select>
              </div>
              <div class="col-6 mb-2">
                <select class="form-select form-select-sm" id="os">
                  <option value="Redis">Redis</option>
                  <option value="Memcached">Memcached</option> 
                </select>
              </div>
              <div class="col-6 pe-2">
                <select class="form-select form-select-sm" id="cost_duration">
                  <option value="secondly">Per Second</option>
                  <option value="minutely">Per Minute</option>
                  <option value="hourly" selected="selected">Per Hour</option>
                  <option value="daily">Per Day</option>
                  <option value="weekly">Per Week</option>
                  <option value="monthly">Per Month</option>
                  <option value="annually">Per Year</option>
                </select>
              </div>
              <div class="col-6">
                <select class="form-select form-select-sm" id="reserved_term">
                  <option value="Standard.noUpfront">No Upfront</option>
                  <option value="Standard.partialUpfront">Partial Upfront</option>
                  <option value="Standard.allUpfront">All Upfront</option>
                </select>
              </div>
            </div>

            <%include file="ads-demo.mako"/>

            <!-- Instance families -->
            <div class="mt-4 d-flex flex-column">
              <div class="d-flex align-items-center mb-3">
                <span class="material-icons me-1">dns</span>
                <p class="h6 fw-semibold mb-0">Family Sizes</p>
              </div>
              <table class="table table-mono">
                <thead>
                  <tr>
                    <th>Size</th>
                    <th class="text-center">vCPUs</th>
                    <th class="text-center">Memory (GiB)</th>
                  </tr>
                </thead>
                <tbody>
                  % for f in family:
                    % if f["name"] == i["Amazon"][1]['value']:
                    <tr class="no-link">
                      <td>${f["name"]}</td>
                    % else:
                    <tr>
                      <td><a href="/aws/elasticache/${f["name"]}">${f["name"]}</a></td>
                    % endif
                    <td class="text-center">${f["cpus"]}</td>
                    <td class="text-center">${f["memory"]}</td>
                  </tr>
                  % endfor
                </tbody>
              </table>
            </div>

            <div class="d-flex justify-content-center">
              <div>
                <a href="/cache/?selected=${i["Amazon"][1]["value"]}" class="btn btn-white">
                  Compare ${i["Amazon"][1]["value"]} to other Instances
                </a>
              </div>
            </div>

            <!-- Instance variants -->
            % if len(variants) > 1:
            <div class="mt-4 d-flex flex-column">
              <div class="d-flex align-items-center mb-3">
                <span class="material-icons me-1">dns</span>
                <p class="h6 fw-semibold mb-0">Instance Variants</p>
              </div>
              <table class="table table-mono">
                <tbody>
                  % for v in variants:
                    % if v[0] == i["Amazon"][1]['value']:
                      <tr class="no-link">
                        <td>${v[0]}</td>
                    % else:
                      <tr>
                        <td><a href="/aws/elasticache/${v[1]}">${v[0]}</a></td>
                    % endif
                    </tr>
                  % endfor
                </tbody>
              </table>
            </div>
            % endif
          </div>

          <div class="column-middle mb-5" style="max-width: 800px;">
            <div class="w-100 d-flex flex-column flex-fill pb-5">          
              <div class="d-flex align-items-center mb-3">
                <span class="material-icons me-1">info</span>
                <p class="h6 fw-semibold mb-0">Instance Details</p>
              </div>
              % for category, attrs in i.items():
                % if category != "Pricing" and category != "Not Shown" and len(attrs) > 0:
                  <table class="table" id="${category}">
                    <tr>
                      <th class="col-6 border-end"><a href="#${category}">${category}</a></th>
                      <th class="col-6">Value</th>
                    </tr>
                  % for a in attrs:
                    <tr>
                      <td class="col-6 border-end">${a["display_name"]}</td>
                      <td class="col-6"><span class="${a["style"]}">${a["value"]}</span></td>
                    </tr>
                  % endfor
                  </table>
                % endif
              % endfor
              % if len(unavailable) > 0 and false:
                <table class="table" id="Unavailable">
                  <tr>
                    <th class="col-4 border-end">Unavailable</th>
                    <th class="col-4 border-end">Unsupported Region</th>
                    <th class="col-4">Unsupported OS</th>
                  </tr>
                  % for u in unavailable:
                  <tr>
                    <td class="col-4 border-end">${u[0]}</td>
                    <td class="col-4 border-end">${u[1]}</td>
                    <td class="col-4">${u[2]}</td>
                  </tr>
                  % endfor
                </table>
              % endif
            </div>
          </div>

          <%include file="ads-detail-column.mako"/>
        </div>
      </div>
    </div>

  <script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js" type="text/javascript" charset="UTF-8"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/js/bootstrap.min.js" crossorigin="anonymous"></script>
  <script src="/store/store.js" type="text/javascript" charset="UTF-8"></script>
  <script src="/vantage.js" type="text/javascript" charset="UTF-8"></script>
  <script>
    const scriptURL = 'https://script.google.com/macros/s/AKfycbzf3nm7AMdE5JRgU_-R_VFNdekkzhN1-RjiQDeqZu3UsojLH6Kdvo5G0pyC0UzJJKo4/exec'
    const form = document.forms['submit-to-google-sheet']

    form.addEventListener('submit', e => {
      e.preventDefault();
      $("#submit-feedback").attr("disabled", true);
      fetch(scriptURL, { method: 'POST', body: new FormData(form)})
        .then(response => {
          $("#submission-response").html("Feedback received!"); 
          $("#submit-feedback").attr("disabled", false); 
        })
        .catch(error => $("#submission-response").html("Something went wrong, contact support@vantage.sh"));
    })
  </script>
  <script type="text/javascript">
  $(function() {
    

    initialize_prices();
    disable_regions();

    get_filters_from_url();
    $('a').on('click', function (e) {
      var link_name = $(e.target).attr('href');
      if (typeof link_name !== 'undefined' && link_name !== false) {
        if(link_name.includes('/aws/')) {
          e.preventDefault();
          // get the URL params and add them to the link
          location.href = this.href + window.location.search;
        }
      }
    });

    $('#region').change(function() {
      recalulate_redisplay_prices()
    });
    $('#os').change(function() {
      recalulate_redisplay_prices()
    });
    $('#cost_duration').change(function() {
      recalulate_redisplay_prices()
    });
    $('#reserved_term').change(function() {
      recalulate_redisplay_prices()
    });


    function format_price(element, price_value) {
      // Handle prices from $0.0001 to $100,000
      if (isNaN(price_value)) {
        $('#' + element).html('N/A');
      } else if (price_value === "N/A") {
        $('#' + element).html('N/A');
      } else if (price_value < .99) {
        $('#' + element).html("&dollar;" + price_value.toFixed(4));
      }
      else if (price_value > 99 && price_value <= 9999) {
        $('#' + element).html("&dollar;" + price_value.toFixed(2));
      }
      else if (price_value > 9999) {
        // TODO: localize, use periods instead of commas in EU for example
        $('#' + element).html("&dollar;" + Math.floor(price_value).toLocaleString('en-US'));
      } else {
        $('#' + element).html("&dollar;" + price_value.toFixed(3));
      }
    }

    function initialize_prices() {
      format_price("p_od", ${defaults[0]});
      format_price("p_1yr", ${defaults[1]});
      format_price("p_3yr", ${defaults[2]});
    };

    function disable_regions() {
      var regions = []
      var unavailable = ${unavailable};
      for (const u of unavailable) {
        if (u[2] == 'All') {
          regions.push(u[1]);
        }
      }

      $("#region option").each(function(i) {
        var dropdown_region = $(this).val();
        if (regions.includes(dropdown_region)) {
          $(this).attr("disabled", "disabled");
        }
      });

    };

    function recalulate_redisplay_prices() {
      var region = $('#region option:selected').map(function(i,v) {
        return this.value;
      }).get()[0];
      var os = $('#os').val();
      var cost_duration = $('#cost_duration').val();
      var reserved_term = $('#reserved_term').val();
      var price = ${i["Pricing"]};
      var deny = ${unavailable};
      var displayed_prices = ['ondemand', '_1yr', '_3yr'];
      var elements = ['p_od', 'p_1yr', 'p_3yr'];

      set_url_from_filters(region, os, cost_duration, reserved_term);

      // Check if this combination of price selections is available
      // Handle where only a specifc OS like Windows is not available in a region
      for (const d of deny) {
        if (d[1] === region) {
          if (d[3] === os || d[2] === 'All') {
            for (var i = 0; i < elements.length; i++) {
              format_price(elements[i], "N/A");
            }
            return;
          } 
        }
      }

      var hour_multipliers = {
        'secondly': 1 / (60 * 60),
        'minutely': 1 / 60,
        'hourly': 1,
        'daily': 24,
        'weekly': 7 * 24,
        'monthly': 730,   // use AWS convention of 730 hrs/month
        'annually': 8760
      };


      for(var i =0; i < elements.length; i++) {
        var element = elements[i];
        var displayed_price = displayed_prices[i];
        
        var price_value = price[region][os][displayed_price];

        if (price_value == 'N/A') {
          $('#' + element).html('N/A');
        } else {

          // Handle the term conditions for reservations
          if (displayed_price === '_1yr' || displayed_price === '_3yr') {
            price_value = parseFloat(price_value[reserved_term]);
          }
          
          // Show by day, month, year etc
          price_value = parseFloat(price_value) * hour_multipliers[cost_duration];

          format_price(element, price_value);
        }
      }
    }
    
    function set_url_from_filters(region, os, cost_duration, reserved_term) {
      // update URL parameters with new values
      var url = new URL(window.location.href);
      url.searchParams.set('region', region);
      url.searchParams.set('os', os);
      url.searchParams.set('cost_duration', cost_duration);
      url.searchParams.set('reserved_term', reserved_term);
      window.history.pushState({}, '', url);
    }

    function get_filters_from_url() {
      // read the URL params and update the dropdowns
      var urlParams = new URLSearchParams(window.location.search);
      var region = urlParams.get('region');
      var os = urlParams.get('os');
      var cost_duration = urlParams.get('cost_duration');
      var reserved_term = urlParams.get('reserved_term');
      var defaults = true;
      if (region) {
        var unavailable = ${unavailable};
        for (const u of unavailable) {
          if (u[1] == region && u[2] == 'All') {
            console.log('Selected region not available');
          }
        }
        $('#region').val(region);
        defaults = false;
      }
      if (os) {
        $('#os').val(os);
        defaults = false;
      }
      if (cost_duration) {
        $('#cost_duration').val(cost_duration);
        defaults = false;
      }
      if (reserved_term) {
        reserved_term = reserved_term.replace('yrTerm1', '');
        reserved_term = reserved_term.replace('yrTerm3', '');
        $('#reserved_term').val(reserved_term);
        defaults = false;
      }

      if (!defaults) {
        recalulate_redisplay_prices();
      }
    }
    
  });
  </script>
  </body>
</html>