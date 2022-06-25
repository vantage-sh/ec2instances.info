<%!
  active_ = "ec2"
  import json
  import six
%>
<%inherit file="base.mako" />
    
    <%block name="meta">
        <title>${instance_type} Details</title>
        <meta name="description" content="${instance_type} CPUs, memory, storage and pricing"></head>
    </%block>

    <%block name="header">
    <h1>EC2Instances.info <small>Easy Amazon <b>ElastiCache</b> Instance Comparison</small></h1>
    </%block>

    <h1>${instance_type}</h1>

    <div>
    % if instance_attrs:
        <ul>
            <li>Family Category: ${instance_attrs['family_category']}</li>
            <li>CPUs: ${instance_attrs['cpu']}</li>
            <li>CPU Type: ${instance_attrs['cpu_type']}</li>
            <li>Memory: ${instance_attrs['memory']}</li>
            <li>Storage: ${instance_attrs['storage_boot']}</li>
            <li>Disk: ${instance_attrs['storage_extra']}</li>
            <li>Network bandwidth: ${instance_attrs['network_bandwidth']}</li>
            <li>Family Page: ${instance_attrs['family_url']}</li>
        </ul>
    % else:
      <p>No data available</p>
    % endif
    </div>