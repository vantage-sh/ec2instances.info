<%!
  active_ = "cache"
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
