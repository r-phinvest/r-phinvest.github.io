function labelFormatter(label, series) {
  var l = $(label);
  var dates = [];
  if (l.data('count'))
    $(l).append(' ('+l.data('count')+')');
  if ($('#showStartDate').prop('checked'))
    if ((new Date(l.data('startdate'))) > (new Date($.originalStartDate)))
      dates.push('<span class="startDate future">'+l.data('startdate')+'</span>');
  else
    dates.push('<span class="startDate">'+l.data('startdate')+'</span>');
  if ($('#showEndDate').prop('checked'))
    if ((new Date(l.data('enddate'))) < (new Date($.originalEndDate)))
      dates.push('<span class="endDate past">'+l.data('enddate')+'</span>');
  else
    dates.push('<span class="endDate">'+l.data('enddate')+'</span>');
  if (dates.length) $(l).append(' ('+dates.join(' - ')+')');
  return $(l).append('<span class="remove ui-icon ui-icon-close"></span>').wrap('<p/>').parent().html();
}

function reloadGraph(op = 'reload') {
  // var params = {
  //   legend: $('#legend').val(),
  //   dataset: $('#dataset').val(),
  //   real: $('#real').prop('checked')?1:0,
  //   perannum: $('#perannum').prop('checked')?1:0,
  //   sma5: $('#sma5').prop('checked')?1:0,
  //   start_date: $('#startDate').val(),
  //   end_date: $('#endDate').val()
  // };
  switch (op) {
  case 'clear':
    break;
  case 'reset':
    break;
  default:
  }
}

function addDataSeries(type, id) {
  if ($.dataSeries.find(x => x.type == type && x.id == id)) return;  
  var url = 'data/'+id;
  if (Number($('#dataset').val()) > 0) url += '-'+$('#dataset').val();
  url += '.json';
  $.getJSON(url, function(data){
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
      type: type,
      id: id,
      lines: {lineWidth: 1},
      data: data
    });
    $.graph = $.plot('#graph', $.dataSeries, $.options);
  });
/*  if ($.dataSeries.find(x => x.type === type && x.id === id)) return;
  $.getJSON('/include/portfolio/graph-data', {
    dataset: $('#dataset').val(),
    real: $('#real').prop('checked')?1:0,
    perannum: $('#perannum').prop('checked')?1:0,
    sma5: $('#sma5').prop('checked')?1:0,
    type: type,
    id: id,
    start_date: $('#startDate').val(),
    end_date: $('#endDate').val()
  }, function(data){
    var startDate = new Date(data.data[0][0]+28800000).toISOString().split('T')[0];
    var endDate = new Date(data.data[data.data.length-1][0]+28800000).toISOString().split('T')[0];
    var label;
    label = '<span class="label" data-id="'+id+'" data-type="'+type+'" data-startdate="'+startDate+'" data-enddate="'+endDate+'"';
    if (type == 'aggregate') label += ' data-count="'+data.count+'"';
    label += '>'+name+'</span>';
    $.dataSeries.push({
      type: type,
      id: id,
      data: data.data,
      label: label,
      lines: { lineWidth: 1 }
    });
    $.graph = $.plot('#graph', $.dataSeries, $.options);
  });*/
}

$(function(){
  $.idArray = {
    'MF'          : 2**12,
    'UITF'        : 2**13,
    'Equity'      : 2**14,
    'Bond'        : 2**15,
    'Balanced'    : 2**16,
    'Money Market': 2**17,
    'PHP'         : 2**18,
    'USD'         : 2**19,
    'EUR'         : 2**20,
    'JPY'         : 2**21
  };
  for (var key in $.entries)
    switch ($.entries[key].type) {
    case "fund":
      $('#funds').append('<option value="'+$.entries[key].id+'">'+$.entries[key].name+'</option>');
      break;
    case "index":
      $('#indexes').append('<option value="'+$.entries[key].id+'">'+$.entries[key].name+'</option>');
      break;
    default:
      $('#portfolios').append('<option value="'+$.entries[key].id+'">'+$.entries[key].name+'</option>');
    }
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
      bottom: $(this).height()-item.pageY+290,
      right: $(this).width()-item.pageX+370
    }).fadeIn(200);
    else $('#tooltip').hide();
  });
  $('#graph').bind('plotclick', function(event, pos, item){
    if (item)
      $.get('/include/portfolio/portfolio', {trade_date: (new Date(item.datapoint[0]+28800000).toISOString().split('T')[0])}, function(data){
	$('#portfolioDiv').html(data);
      });
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
    yearRange: '1984:2019'
  });
  $('#endDate').datepicker({
    dateFormat: 'yy-mm-dd',
    changeMonth: true,
    changeYear: true,
    constrainInput: true,
    yearRange: '1984:2019'
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
    $.startDate = '';
    $.endDate = '';
    $.each($.graph.getXAxes(), function(_, axis){
      var opts = axis.options;
      opts.min = new Date($('#startDate').val()).getTime();
      opts.max = new Date($('#endDate').val()).getTime();
    });
    $.graph.setupGrid();
    $.graph.draw();
    $.graph.clearSelection();
  });
  $('#zoomOut').click(function(){
    $.startDate = '';
    $.endDate = '';
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
      addDataSeries('fund', Number($('#funds').val()));
  });
  $('#addIndex').click(function(){
    if ($('#indexes').val())
      addDataSeries('index', Number($('#indexes').val()));
  });
  $('#addPortfolio').click(function(){
    if ($('#portfolios').val())
      addDataSeries('portfolio', Number($('#portfolios').val()));
  });
  $('#addAggregate').click(function(){
    var types = $('#aggregates input[name=type]:checked').map(function(){ return this.value; }).get();
    var classifications = $('#aggregates input[name=classification]:checked').map(function(){ return this.value; }).get();
    var currencies = $('#aggregates input[name=currency]:checked').map(function(){ return this.value; }).get();
    var id = 2**11;
    for (const i of types.concat(classifications, currencies)) id |= $.idArray[i];
    var name = [];
    if (types.length && types.length < 2) name.push(types.join('+'));
    else name.push('MF+UITF');
    if (classifications.length && classifications.length < 4) name.push(classifications.join('+'));
    if (currencies.length && currencies.length < 4) name.push(currencies.join('+'));
    addDataSeries('aggregate', id);
  });
  addDataSeries('index', 1);
  addDataSeries('portfolio', 100);
  addDataSeries('portfolio', 101);
  addDataSeries('fund', 804);
});
