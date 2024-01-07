<%!
  active_ = "azure"
  import json
  import six
%>
<%inherit file="base-azure.mako" />
    
    <%block name="meta">
        <title>Azure VM Comparison</title>
        <meta name="description" content="A free and easy-to-use tool for comparing Azure VM features and prices."></head>
    </%block>
    

    <div class="row mt-3 me-2" id="menu">
      <div class="col-sm-12 ms-2">

        <div class="btn-group-vertical" id='region-dropdown'>
          <label class="dropdown-label mb-1">Region</label>
          <a class="btn dropdown-toggle btn-primary" data-bs-toggle="dropdown" role="button" href="#">
            <i class="icon-globe icon-white"></i>
            <span class="text">(US) East US</span>
            <span class="caret"></span>
          </a>
          <ul class="dropdown-menu" role="menu">
          % for r in regions:
            <li><a class="dropdown-item" href="javascript:;" data-region='${r[0]}'><span>${r[1]}</span></a></li>
          % endfor
          </ul>
        </div>

        <div class="btn-group-vertical" id="pricing-unit-dropdown">
          <label class="dropdown-label mb-1">Pricing Unit</label>
          <a class="btn dropdown-toggle btn-primary" data-bs-toggle="dropdown" role="button" href="#">
            <i class="icon-shopping-cart icon-white"></i>
            <span class="text">Instance</span>
            <span class="caret"></span>
          </a>
          <ul class="dropdown-menu" role="menu">
            <li class="active"><a class="dropdown-item" href="javascript:;" pricing-unit="instance">Instance</a></li>
            <li><a class="dropdown-item" href="javascript:;" pricing-unit="vcpu">vCPU</a></li>
            <li><a class="dropdown-item" href="javascript:;" pricing-unit="acu">ACU</a></li>
            <li><a class="dropdown-item" href="javascript:;" pricing-unit="memory">Memory</a></li>
           </ul>
        </div>

        <div class="btn-group-vertical" id="cost-dropdown">
          <label class="dropdown-label mb-1">Cost</label>
          <a class="btn dropdown-toggle btn-primary" data-bs-toggle="dropdown" role="button" href="#">
            <i class="icon-shopping-cart icon-white"></i>
            <span class="text">Hourly</span>
            <span class="caret"></span>
          </a>
          <ul class="dropdown-menu" role="menu">
            <li><a class="dropdown-item" href="javascript:;" duration="secondly">Per Second</a></li>
            <li><a class="dropdown-item" href="javascript:;" duration="minutely">Per Minute</a></li>
            <li class="active"><a class="dropdown-item" href="javascript:;" duration="hourly">Hourly</a></li>
            <li><a class="dropdown-item" href="javascript:;" duration="daily">Daily</a></li>
            <li><a class="dropdown-item" href="javascript:;" duration="weekly">Weekly</a></li>
            <li><a class="dropdown-item" href="javascript:;" duration="monthly">Monthly</a></li>
            <li><a class="dropdown-item" href="javascript:;" duration="annually">Annually</a></li>
          </ul>
        </div>

        <div class="btn-group-vertical" id='reserved-term-dropdown'>
          <label class="dropdown-label mb-1">Committed Use Discounts</label>
          <a class="btn dropdown-toggle btn-primary" data-bs-toggle="dropdown" role="button" href="#">
            <i class="icon-globe icon-white"></i>
            <span class="text">1-year - Reservation</span>
            <span class="caret"></span>
          </a>
          <ul class="dropdown-menu" role="menu">
            <li><a class="dropdown-item" href="javascript:;" data-reserved-term='yrTerm1Standard.allUpfront'>1-year - Reservation</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-reserved-term='yrTerm3Standard.allUpfront'>3-year - Reservation</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-reserved-term='yrTerm1Standard.hybridbenefit'>1-year - Reservation (Hybrid Benefit)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-reserved-term='yrTerm3Standard.hybridbenefit'>3-year - Reservation (Hybrid Benefit)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-reserved-term='yrTerm1Savings.allUpfront'>1-year - Savings Plan</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-reserved-term='yrTerm3Savings.allUpfront'>3-year - Savings Plan</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-reserved-term='yrTerm1Savings.hybridbenefit'>1-year - Savings Plan (Hybrid Benefit)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-reserved-term='yrTerm3Savings.hybridbenefit'>3-year - Savings Plan (Hybrid Benefit)</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-reserved-term='yrTerm1Standard.subscription'>1-year - Subscription</a></li>
            <li><a class="dropdown-item" href="javascript:;" data-reserved-term='yrTerm3Standard.subscription'>3-year - Subscription</a></li>
          </ul>
        </div>

        <div class="btn-group-vertical" id="filter-dropdown">
          <!-- blank label maintains spacing -->
          <label class="dropdown-label mb-1"><br></label>
          <a class="btn dropdown-toggle btn-primary" data-bs-toggle="dropdown" role="button" href="#">
            <i class="icon-filter icon-white"></i>
            Columns
            <span class="caret"></span>
          </a>
          <ul class="dropdown-menu" role="menu">
            <!-- table header elements inserted by js -->
          </ul>
        </div>

        <div class="btn-group-vertical">
          <label class="dropdown-label mb-1"><br></label>
          <button class="btn btn-purple btn-compare"
            data-text-on="End Compare"
            data-text-off="Compare Selected">
            Compare Selected
          </button>
        </div>

        <div class="btn-group-vertical">
          <label class="dropdown-label mb-1"><br></label>
          <button class="btn btn-primary btn-clear" id="clear">
            Clear Filters
          </button>
        </div>

        <div class="btn-group-vertical float-end m2 p2" id="search">
          <label class="dropdown-label mb-1"><br></label>
          <input id="fullsearch" type="text" class="form-control d-none d-xl-block" placeholder="Search...">
        </div>

        <div class="btn-group-vertical float-end px-2">
          <label class="dropdown-label mb-1"><br></label>
          <div class="btn-primary" id="export"></div>
        </div>

      </div>
    </div>

  <div class="table-responsive overflow-auto wrap-table flex-fill">
    <table cellspacing="0" class="table" style="border-bottom: 0 !important; margin-bottom: 0 !important;" id="data">
      <thead>
        <tr>
          <th class="name">Name</th>
          <th class="apiname">API Name</th>
          <th class="memory">Instance Memory</th>
          <th class="vcpu">
            <abbr title="Each virtual CPU is a hyperthread of an Intel Xeon core for M3, C4, C3, R3, HS1, G2, I2, and D2">vCPUs</abbr>
          </th>
          <th class="memory-per-vcpu">GiB of Memory per vCPU</th>
          <th class="gpus">GPUs</th>
          <th class="storage">Instance Storage</th>
          <th class="cost-ondemand cost-ondemand-linux">Linux On Demand cost</th>
          <th class="cost-savings-plan cost-savings-plan-linux">
            <abbr>Linux Savings Plan</abbr>
          </th>
          <th class="cost-reserved cost-reserved-linux">
            <abbr title='Reserved costs are an "effective" hourly rate, calculated by hourly rate + (upfront cost / hours in reserved term).  Actual hourly rates may vary.'>Linux Reserved cost</abbr>
          </th>
          <th class="cost-spot-min cost-spot-min-linux">Linux Spot cost</th>

          <th class="cost-ondemand cost-ondemand-windows">Windows On Demand cost</th>
          <th class="cost-savings-plan cost-savings-plan-windows">
            <abbr>Windows Savings Plan</abbr>
          </th>
          <th class="cost-reserved cost-reserved-windows">
            <abbr title='Reserved costs are an "effective" hourly rate, calculated by hourly rate + (upfront cost / hours in reserved term).  Actual hourly rates may vary.'>Windows Reserved cost</abbr>
          </th>
          <th class="cost-spot-min cost-spot-min-windows">Windows Spot cost</th>

        </tr>
      </thead>

      <tbody>
        % for inst in instances:
          <tr class='instance' id="${inst['instance_type']}">
            <td class="name">${inst['pretty_name_azure']}</td>
            <td class="apiname"><a href="/azure/vm/${inst['instance_type']}">${inst['pretty_name']}</a></td>
            <td class="memory"><span sort="${inst['memory']}">${inst['memory']} GiB</span></td>
            <td class="vcpu">
              <span sort="${inst['vcpu']}">
                ${inst['vcpu']} vCPUs
              </span>
            </td>
            <td class="memory-per-vcpu">
              % if inst['memory_per_vcpu'] == 'unknown':
              <span sort="999999">unknown</span>
              % else:
              <span sort="${inst['memory_per_vcpu']}">${"{:.2f}".format(inst['memory_per_vcpu'])} GiB/vCPU</span>
              % endif
            </td>
            <td class="gpus">
              <span sort="${inst['GPU']}">
                ${inst['GPU']}
              </span>
            </td>
            <td class="storage">
              <span sort="${inst['size']}">
                ${inst['size']}
              </span>
            </td>
            
            % for platform in ['linux', 'windows',]:
              ## note that the contents in these cost cells are overwritten by the JS change_cost() func, but the initial
              ## data here is used for sorting (and anyone with JS disabled...)
              ## for more info, see https://github.com/powdahound/ec2instances.info/issues/140
              <td class="cost-ondemand cost-ondemand-${platform}" data-platform="${platform}" data-vcpu="${inst['vcpu']}" data-memory="${inst['memory']}">
                % if inst['pricing'].get('us-east', {}).get(platform, {}).get('ondemand', 'N/A') != "N/A":
                  <span sort="${inst['pricing']['us-east'][platform]['ondemand']}">
                    $${"{:.4f}".format(float(inst['pricing']['us-east'][platform]['ondemand']))} hourly
                  </span>
                % else:
                  <span sort="999999">unavailable</span>
                % endif
              </td>

              <td class="cost-savings-plan cost-savings-plan-${platform}" data-platform="${platform}" data-vcpu="${inst['vcpu']}" data-memory="${inst['memory']}">
                % if inst['pricing'].get('us-east', {}).get(platform, {}).get('reserved', 'N/A') != "N/A" and inst['pricing']['us-east'][platform]['reserved'].get('yrTerm1Savings.allUpfront', 'N/A') != "N/A":
                  <span sort="${inst['pricing']['us-east'][platform]['reserved']['yrTerm1Savings.allUpfront']}">
                    $${"{:.4f}".format(float(inst['pricing']['us-east'][platform]['reserved']['yrTerm1Savings.allUpfront']))} hourly
                  </span>
                % else:
                  <span sort="999999">unavailable</span>
                % endif
              </td>

              <td class="cost-reserved cost-reserved-${platform}" data-platform="${platform}" data-vcpu="${inst['vcpu']}" data-memory="${inst['memory']}">
                % if inst['pricing'].get('us-east', {}).get(platform, {}).get('reserved', 'N/A') != "N/A" and inst['pricing']['us-east'][platform]['reserved'].get('yrTerm1Standard.allUpfront', 'N/A') != "N/A":
                  <span sort="${inst['pricing']['us-east'][platform]['reserved']['yrTerm1Standard.allUpfront']}">
                    $${"{:.4f}".format(float(inst['pricing']['us-east'][platform]['reserved']['yrTerm1Standard.allUpfront']))} hourly
                  </span>
                % else:
                  <span sort="999999">unavailable</span>
                % endif
              </td>

              <td class="cost-spot-min cost-spot-min-${platform}" data-platform="${platform}" data-vcpu="${inst['vcpu']}" data-memory="${inst['memory']}">
                % if inst['pricing'].get('us-east', {}).get(platform, {}).get('spot_min', 'N/A') != 'N/A':
                  <%
                      spot_min = inst['pricing']['us-east'][platform]['spot_min']
                  %>
                  <span sort="${spot_min}">
                    $${"{:.4f}".format(float(spot_min))} hourly
                  </span>
                % else:
                  <span sort="999999">unavailable</span>
                % endif
              </td>

            % endfor

          </tr>
        % endfor
      </tbody>
    </table>

    <div class="mt-4 pt-4 mb-4 d-flex flex-container justify-content-center">
      <div class="d-none d-lg-block">
      <div class="vantage-callout" style="min-width:640px">
        <div class="callout-close">
          <span class="material-icons">close</span>
        </div>
        <img width="auto" height="25" alt="Vantage Logo" src="/vantage-logo_full.svg">
        <h5>Concerned about cloud costs?</h5>
        <p>Connect your Azure account in under<br />5 minutes to see savings.</p>
        <a href="https://console.vantage.sh/signup" target="_blank">Connect Azure Account</a>
      </div>
      </div>
    </div>

  </div>

  <%block name="header">
    <h1 class="page-h1">Easy <b>Azure VM</b> Comparison</h1>
  </%block>