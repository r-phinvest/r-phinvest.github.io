function labelFormatter(label, series) {
  var l = $(label);
  var dates = [];
  if ($('#showStartDate').prop('checked'))
    if ((new Date(l.data('startdate'))) > (new Date($('#startDate').val())))
      dates.push('<span class="startDate future">'+l.data('startdate')+'</span>');
    else
      dates.push('<span class="startDate">'+l.data('startdate')+'</span>');
  if ($('#showEndDate').prop('checked'))
    if ((new Date(l.data('enddate'))) < (new Date($('#endDate').val())))
      dates.push('<span class="endDate past">'+l.data('enddate')+'</span>');
    else
      dates.push('<span class="endDate">'+l.data('enddate')+'</span>');
  if (dates.length) $(l).append(' ('+dates.join(' - ')+')');
  return $(l).append('<span class="remove ui-icon ui-icon-close"></span>').wrap('<p/>').parent().html();
}

function reloadGraph(op = 'reload') {
  switch (op) {
  case 'clear':
    break;
  case 'reset':
    break;
  default:
  }
}

function setupDataSeries(id) {
  var data = $.entryData[id];
  var startDate = new Date(data.data[0][0]+28800000).toISOString().split('T')[0];
  var endDate = new Date(data.data[data.data.length-1][0]+28800000).toISOString().split('T')[0];
  if ($('#startDate').val()) {
    data.data = data.data.filter(x => x[0] >= new Date($('#startDate').val()));
    startDate = new Date(data.data[0][0]+28800000).toISOString().split('T')[0];
  } else $('#startDate').val(startDate);
  if ($('#endDate').val()) {
    data.data = data.data.filter(x => x[0] <= new Date($('#endDate').val()));
    endDate = new Date(data.data[data.data.length-1][0]+28800000).toISOString().split('T')[0];
  } else $('#endDate').val(endDate);
  switch ($('#dataset').val()) {
  case '-1':
    data = data.data.map(x => [x[0], (data.data[data.data.length-1][1] / x[1] - 1) * 100]);
    break;
  case '0':
    data = data.data.map(x => [x[0], (x[1] / data.data[0][1] - 1) * 100]);
    break;
  default:
    data = data.data;
  }
  $.dataSeries.push({
    id: id,
    label: '<span class="label" data-id="'+id+'" data-startdate="'+startDate+'" data-enddate="'+endDate+'">'+entries[id].name+'</span>',
    lines: {lineWidth: 1},
    data: data
  });
  $.graph = $.plot('#graph', $.dataSeries, $.options);
}

function addDataSeries(id) {
  if ($.dataSeries.find(x => x.id == id)) return;
  if (id in $.entryData) {
    setupDataSeries(id);
  } else {
    var url = 'data/'+id;
    if (Number($('#dataset').val()) > 0) url += '-'+$('#dataset').val();
    url += '.json';
    $.getJSON(url, function(data){
      $.entryData[id] = data;
      setupDataSeries(id);
    });
  }
}

function initGraph() {
  var params = new URLSearchParams(window.location.search);
  params.forEach(function(value, key){
    switch (key) {
    case 'id':
      addDataSeries(value);
      break;
    case 'legend':
    case 'dataset':
    case 'startDate':
    case 'endDate':
      $('#'+key).val(value);
      break;
    case 'real':
    case 'perannum':
    case 'sma5':
      $('#'+key).prop('checked', true);
      break;
    }
  });
}

$(function(){
  $.entryData = {};
  $.dataSeries = [];
  $.options = {
    xaxis: {mode: 'time'},
    legend: {
      position: 'nw',
      backgroundOpacity: 0,
      labelFormatter: labelFormatter
    },
    selection: {mode: 'x'},
    grid: {
      hoverable: true,
      clickable: true
    }
  };
  $.graph = $.plot('#graph', $.dataSeries, $.options);
  for (var key in entries)
    switch (entries[key].type) {
    case "fund":
      $('#funds').append('<option value="'+key+'">'+entries[key].name+'</option>');
      break;
    case "index":
      $('#indexes').append('<option value="'+key+'">'+entries[key].name+'</option>');
      break;
    default:
      $('#portfolios').append('<option value="'+key+'">'+entries[key].name+'</option>');
    }
  $('#width').val($('#graph').width());
  $('#height').val($('#graph').height());
  $('#graph').bind('plotselected', function(event, ranges){
    $.startDate = $('#startDate').val();
    $.endDate = $('#endDate').val();
    $('#startDate').val(new Date(ranges.xaxis.from+28800000).toISOString().split('T')[0]);
    $('#endDate').val(new Date(ranges.xaxis.to+28800000).toISOString().split('T')[0]);
  });
  $('#graph').bind('plotunselected', function(){
    if ($.startDate && $.endDate) {
      $('#startDate').val($.startDate);
      $('#endDate').val($.endDate);
      $.startDate = '';
      $.endDate = '';
    }
  });
  $('#graph').bind('plothover', function(event, pos, item){
    if (item) $('#tooltip').html(item.series.label+'<br />'+(new Date(item.datapoint[0]+28800000).toISOString().split('T')[0])+'<br />'+item.datapoint[1].toFixed(2)).css({
      bottom: $(this).height()-item.pageY+250,
      right: $(this).width()-item.pageX+20
    }).fadeIn(200);
    else $('#tooltip').hide();
  });
  $('#legend').change(function(){
    $.graph.getOptions().legend.position = $('#legend').val();
    $.graph.setupGrid();
  });
  $('#dataset').change(function(){
    reloadGraph();
  });
  $('#real').change(function(){
    reloadGraph();
  });
  $('#perannum').change(function(){
    reloadGraph();
  });
  $('#sma5').change(function(){
    reloadGraph();
  });
  $('#startDate').datepicker({
    dateFormat: 'yy-mm-dd',
    changeMonth: true,
    changeYear: true,
    constrainInput: true,
    yearRange: '1986:2019'
  });
  $('#endDate').datepicker({
    dateFormat: 'yy-mm-dd',
    changeMonth: true,
    changeYear: true,
    constrainInput: true,
    yearRange: '1986:2019'
  });
  $('#showStartDate').change(function(){
    $.graph.setupGrid();
  });
  $('#showEndDate').change(function(){
    $.graph.setupGrid();
  });
  $('#update').click(function(){
    reloadGraph();
  });
  $('#zoomIn').click(function(){
    $.each($.graph.getXAxes(), function(_, axis){
      var opts = axis.options;
      opts.min = new Date($('#startDate').val()).getTime();
      opts.max = new Date($('#endDate').val()).getTime();
    });
    $.originalStartDate = $('#startDate').val();
    $.originalEndDate = $('#endDate').val();
    $.graph.setupGrid();
    $.graph.draw();
    $.graph.clearSelection();
  });
  $('#zoomOut').click(function(){
    $.each($.graph.getXAxes(), function(_, axis){
      var opts = axis.options;
      $('#startDate').val($.originalStartDate);
      $('#endDate').val($.originalEndDate);
      opts.min = new Date($.originalStartDate).getTime();
      opts.max = new Date($.originalEndDate).getTime();
    });
    $.graph.setupGrid();
    $.graph.draw();
    $.graph.clearSelection();
  });
  $('input.size').change(function(){
    $('#graph').css({width: $('#width').val(), height: $('#height').val()});
    $.graph.resize();
    $.graph.setupGrid();
    $.graph.draw();
  });
  $('#reset').click(function(){
    reloadGraph('reset');
  });
  $('#clear').click(function(){
    $('#dataset').val(0);
    $('#real').prop('checked', 0);
    $('#perannum').prop('checked', 0);
    $('#sma5').prop('checked', 0);
    reloadGraph('clear');
  });
  $('#graph').on('click', 'span.startDate', function(){
    $('#startDate').val($(this).html());
    reloadGraph();
  });
  $('#graph').on('click', 'span.endDate', function(){
    $('#endDate').val($(this).html());
    reloadGraph();
  });
  $('#graph').on('click', 'span.remove', function(){
    var id = $(this).parent().data('id');
    var type = $(this).parent().data('type');
    $.get('remove', {type: type, id: id}, function(){
      $.dataSeries = $.dataSeries.filter(x => x.type !== type || x.id !== id);
      $.graph = $.plot('#graph', $.dataSeries, $.options);
    });
  });
  $('#graph').on('mouseover', 'span.label', function(){
    $(this).find('span.remove').css('display', 'inline-block');
  });
  $('#graph').on('mouseout', 'span.label', function(){
    $(this).find('span.remove').hide();
  });
  $('#addFund').click(function(){
    if ($('#funds').val())
      addDataSeries($('#funds').val());
  });
  $('#addIndex').click(function(){
    console.log($('#indexes').val());
    if ($('#indexes').val())
      addDataSeries($('#indexes').val());
  });
  $('#addPortfolio').click(function(){
    if ($('#portfolios').val())
      addDataSeries($('#portfolios').val());
  });
  initGraph();
});
