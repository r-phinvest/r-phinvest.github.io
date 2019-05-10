Date.prototype.toISODate = function(){
  return (new Date(this.getTime() - this.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
}

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

function reloadGraph() {
  $.dataSeries = [];
  $.graph = $.plot('#graph', $.dataSeries, $.options);
  for (var id of $.ids) addDataSeries(id);
  shareURL();
}

function setupDataSeries(id, data) {
  if (!data.length) return;
  startDate = (new Date(data[0][0])).toISODate();
  endDate = (new Date(data[data.length-1][0])).toISODate();
  if ($('#startDate').val()) {
    data = data.filter(x => new Date(x[0]) >= new Date($('#startDate').val()));
    if (!data.length) return;
    startDate = (new Date(data[0][0])).toISODate();
  } else $('#startDate').val(startDate);
  if ($('#endDate').val()) {
    data = data.filter(x => new Date(x[0]) <= new Date($('#endDate').val()));
    endDate = (new Date(data[data.length-1][0])).toISODate();
  } else $('#endDate').val(endDate);
  switch ($('#dataset').val()) {
  case '-1':
    data = data.map(x => [x[0], (data[data.length-1][1] / x[1] - 1) * 100]);
    break;
  case '0':
    data = data.map(x => [x[0], (x[1] / data[0][1] - 1) * 100]);
    break;
  default:
    data = data.map(x => [x[0], x[1]*100]);
  }
  if ($('#real').prop('checked')) {
    var idata = [];
    switch ($('#dataset').val()) {
    case '-1':
      idata = $.entryData['101'];
      data = data.filter(x => x[0] <= idata[idata.length-1][0]);
      var i0 = idata.find(y => y[0] == data[data.length-1][0])[1];
      data = data.map(function(x){
	var i = idata.find(y => x[0] == y[0])[1];
	return [x[0], ((1 + x[1]/100) / (i0 / i) - 1) * 100];
      });
      break;
    case '0':
      idata = $.entryData['101'];
      data = data.filter(x => x[0] <= idata[idata.length-1][0]);
      var i0 = idata.find(y => y[0] == data[0][0])[1];
      data = data.map(function(x){
	var i = idata.find(y => x[0] == y[0])[1];
	return [x[0], ((1 + x[1]/100) / (i / i0) - 1) * 100];
      });
      break;
    default:
      idata = $.entryData['101-'+$('#dataset').val()];
      data = data.filter(x => x[0] <= idata[idata.length-1][0]);
      data = data.map(function(x){
	var i = idata.find(y => x[0] == y[0])[1];
	return [x[0], ((1 + x[1]/100) / (1 + i) - 1) * 100];
      });
    }
  }
  if ($('#perannum').prop('checked')) {
    switch ($('#dataset').val()) {
    case '-1':
      data = data.map(function(x){
	var days = (new Date(data[data.length-1][0]) - new Date(x[0])) / 86400000;
	var years = days / 365.2422;
	if (years < 1) return x;
	else return [x[0], ((1 + x[1]/100) ** (1 / years) - 1) * 100];
      });
      break;
    case '0':
      data = data.map(function(x){
	var days = (new Date(x[0]) - new Date(data[0][0])) / 86400000;
	var years = days / 365.2422;
	if (years < 1) return x;
	else return [x[0], ((1 + x[1]/100) ** (1 / years) - 1) * 100];
      });
      break;
    default:
      data = data.map(function(x){
	var years = Number($('#dataset').val());
	return [x[0], ((1 + x[1]/100) ** (1 / years) - 1) * 100];
      });
    }
  }
  $.dataSeries.push({
    id: id,
    label: '<span class="label" data-id="'+id+'" data-startdate="'+startDate+'" data-enddate="'+endDate+'">'+entries[id].name+'</span>',
    lines: { lineWidth: 1 },
    shadowSize: 0,
    data: data
  });
  $.graph = $.plot('#graph', $.dataSeries, $.options);
}

function fetchDataSeries(id, callback) {
  var entryId = id;
  if (Number($('#dataset').val()) > 0) entryId += '-'+$('#dataset').val();
  else if ($('#sma5').prop('checked') && id != '101') entryId += '-sma5';
  if (entryId in $.entryData)
    callback(id, $.entryData[entryId]);
  else
    $.getJSON('data/'+entryId+'.json', function(data){
      $.entryData[entryId] = data.data;
      callback(id, data.data);
    });
}

function addDataSeries(id) {
  if ($.ids.indexOf(id) == -1) {
    $.ids.push(id);
    shareURL();
  }
  if ($.dataSeries.find(x => x.id == id)) return;
  if ($('#real').prop('checked'))
    fetchDataSeries('101', function(){
      fetchDataSeries(id, setupDataSeries);
    });
  else
    fetchDataSeries(id, setupDataSeries);
}

function shareURL() {
  var url = location.protocol+'//'+location.host+location.pathname;
  var params = [['dataset='+$('#dataset').val()]], p;
  for (var id of $.ids) params.push('id='+id);
  for (p of ['legend', 'startDate', 'endDate'])
    if ($('#'+p).val()) params.push(p+'='+$('#'+p).val());
  for (p of ['real', 'perannum', 'sma5'])
    if ($('#'+p).prop('checked')) params.push(p+'=true');
  url += '?'+params.join('&')
  $('#url').val(url);
  history.pushState(null, null, url);
}

function initGraph() {
  var params = new URLSearchParams(window.location.search);
  params.forEach(function(value, key){
    switch (key) {
    case 'id':
      $.ids.push(value);
      break;
    case 'legend':
      $('#legend').val(value);
      $.options.legend.position = value;
      break;
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
  for (var id of $.ids) addDataSeries(id);
  shareURL();
}

$(function(){
  $.ids = [];
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
  var funds = [];
  for (var key in entries)
    switch (entries[key].type) {
    case "fund":
      funds.push([key, entries[key].name]);
      break;
    case "index":
      $('#indexes').append('<option value="'+key+'">'+entries[key].name+'</option>');
      break;
    default:
      $('#portfolios').append('<option value="'+key+'">'+entries[key].name+'</option>');
    }
  funds.sort(function(a, b){
    return a[1].toUpperCase() > b[1].toUpperCase() ? 1 : -1;
  });
  for (var f of funds)
    $('#funds').append('<option value="'+f[0]+'">'+f[1]+'</option>');
  $('#width').val($('#graph').width());
  $('#height').val($('#graph').height());
  $('#graph').bind('plotselected', function(event, ranges){
    $.startDate = $('#startDate').val();
    $.endDate = $('#endDate').val();
    $('#startDate').val(new Date(ranges.xaxis.from).toISODate());
    $('#endDate').val(new Date(ranges.xaxis.to).toISODate());
  });
  $('#graph').bind('plotunselected', function(){
    if ($.startDate && $.endDate) {
      $('#startDate').val($.startDate);
      $('#endDate').val($.endDate);
      $.startDate = null;
      $.endDate = null;
    }
  });
  $('#graph').bind('plothover', function(event, pos, item){
    if (item) {
      $('#tooltip').html(item.series.label+'<br />'+(new Date(item.datapoint[0]).toISODate())+'<br />'+item.datapoint[1].toFixed(2))
	.fadeIn(200);
      if (item.pageX+$('#tooltip').width()+20 < $(this).width())
	$('#tooltip').css({
	  top: item.pageY,
	  left: item.pageX+20
	});
      else
	$('#tooltip').css({
	  top: item.pageY,
	  left: item.pageX-$('#tooltip').width()-20,
	});
    } else $('#tooltip').hide();
  });
  $('#legend').change(function(){
    $.options.legend.position = $('#legend').val();
    $.graph.getOptions().legend.position = $('#legend').val();
    $.graph.setupGrid();
    shareURL();
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
    $.originalStartDate = null;
    $.originalEndDate = null;
    reloadGraph();
  });
  $('#zoomIn').click(function(){
    if (!$.startDate || !$.endDate) return;
    $.each($.graph.getXAxes(), function(_, axis){
      var opts = axis.options;
      opts.min = new Date($('#startDate').val()).getTime();
      opts.max = new Date($('#endDate').val()).getTime();
    });
    $.originalStartDate = $.startDate;
    $.originalEndDate = $.endDate;
    $.startDate = null;
    $.endDate = null;
    $.graph.setupGrid();
    $.graph.draw();
    $.graph.clearSelection();
  });
  $('#zoomOut').click(function(){
    if (!$.originalStartDate || !$.originalEndDate) return;
    $.each($.graph.getXAxes(), function(_, axis){
      var opts = axis.options;
      $('#startDate').val($.originalStartDate);
      $('#endDate').val($.originalEndDate);
      opts.min = new Date($.originalStartDate).getTime();
      opts.max = new Date($.originalEndDate).getTime();
    });
    $.originalStartDate = null;
    $.originalEndDate = null;
    $.graph = $.plot('#graph', $.dataSeries, $.options);
  });
  $('input.size').change(function(){
    $('#graph').css({width: $('#width').val(), height: $('#height').val()});
    $.graph.resize();
    $.graph.setupGrid();
    $.graph.draw();
  });
  $('#reset').click(function(){
    if (!$.ids.length) return;
    var min = null, max = null;
    var data; 
    for (var id of $.ids) {
      if (!min || new Date(entries[id].startDate) < min) min = new Date(entries[id].startDate);
      if (!max || new Date(entries[id].endDate) > max) max = new Date(entries[id].endDate);
    }
    $('#startDate').val(min.toISODate());
    $('#endDate').val(max.toISODate());
    reloadGraph();
  });
  $('#clear').click(function(){
    $('#dataset').val(0);
    $('#real').prop('checked', 0);
    $('#perannum').prop('checked', 0);
    $('#sma5').prop('checked', 0);
    $.ids = [];
    $.dataSeries = [];
    $.graph = $.plot('#graph', $.dataSeries, $.options);
    shareURL();
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
    $.ids = $.ids.filter(x => x != id);
    $.dataSeries = $.dataSeries.filter(x => x.id != id);
    $.graph = $.plot('#graph', $.dataSeries, $.options);
    shareURL();
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
    if ($('#indexes').val())
      addDataSeries($('#indexes').val());
  });
  $('#addPortfolio').click(function(){
    if ($('#portfolios').val())
      addDataSeries($('#portfolios').val());
  });
  $('#copyURL').click(function(){
    document.getElementById('url').select();
    document.execCommand('copy');
  });
  initGraph();
});
