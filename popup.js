//'use strict';
$(document).ready(function () {
    new popup();
});

function popup() {
    'use strict';

    console.info('init');
    var _this = this;

    _this.myHoursLogs = undefined;
    _this.worklogTypes = undefined;
    _this.timeUnits = undefined;

    _this.currentDate = moment();
    _this.currentUser = new CurrentUser();
    _this.options = new Options();

    _this.myHoursApi = new MyHoursApi(_this.currentUser);
    _this.axoSoftApi = new AxoSoftApi(_this.options);

    _this.timeRatio = new TimeRatio(showRatio);
    _this.timeRatioAllHourAxo = new TimeRatio(showRatioAllHoursAxo);

    _this.timeLineWidth = 1300;
    _this.noTimeDataText = "n/a";
    _this.noNumberDataText = "n/a";

    _this.isResizing = false;
    _this.lastDownX = 0;


    mapboxgl.accessToken = 'pk.eyJ1IjoiZGF2aWRzYWtlbHNlayIsImEiOiIzM2ExRklBIn0.mx4QxSrjca5HAkaH9SVDuA';

    //init bootstrap tooltips
    // $(function () {
    //     $('[data-toggle="tooltip"]').tooltip()
    // })


    _this.options.load().then(
        function () {
            _this.allHoursApi = new AllHoursApi(
                _this.options);
            _this.currentUser.load(function () {
                console.info(_this.currentUser);

                if (_this.currentUser.accessToken == undefined) {
                    console.info('access token is undefined');

                    if (_this.currentUser.email != undefined) {
                        $('#email').val(_this.currentUser.email);
                    }

                    showLoginPage();
                } else {
                    console.info('got current user.');
                    if (_this.currentUser.refreshToken != undefined) {
                        console.info('refresh token found. lets use it.');
                        showLoadingPage();
                        _this.myHoursApi.getRefreshToken(_this.currentUser.refreshToken).then(
                            function (token) {
                                console.info('got refresh token. token: ');
                                console.info(token);

                                _this.currentUser.setTokenData(token.accessToken, token.refreshToken);
                                _this.currentUser.save();
                                showMainPage();
                            }
                        )
                            .catch(error => {
                                console.error('error: ' + error);
                                showLoginPage();

                            });
                    }
                    else {
                        //myHoursApi.accessToken = currentUser.accessToken;
                        showMainPage();
                    }
                }
            })
        }
    );

    function initInterface() {

        $('#loginButton').click(function () {
            login($('#email').val(), $('#password').val());
        });

        $('#loginContainer input').keyup(function (e) {
            if (e.keyCode == 13) {
                login($('#email').val(), $('#password').val());
            }
        });


        $('#copyToAxoSoftButton').click(function () {
            copyTimelogs();
        });

        $('#ahAttendanceTitle').click(function () {
            showHomePage();
        });

        $('#closeHome').click(function () {
            $('#mainContainer').show();
            $('#homeContainer').hide();
        });

        $('#logOutButton').click(function () {
            _this.currentUser.clear();
            showLoginPage();
        });

        $('#optionsButton').click(function () {
            showOptionsPage();
        });


        $('#previousDay').click(function () {
            _this.currentDate = _this.currentDate.add(-1, 'days');
            getLogs();
        });

        $('#nextDay').click(function () {
            _this.currentDate = _this.currentDate.add(1, 'days');
            getLogs();
        });

        $('#today').click(function () {
            _this.currentDate = _this.currentDate = moment().startOf('day');
            getLogs();
        });

        $('#current-date').click(function () {
            _this.currentDate = _this.currentDate = moment().startOf('day');
            getLogs();
        });

        $('#refresh').click(function () {
            getLogs();
        });

        $('#refreshHome').click(function () {
            getCurrentBalance();
        });


        $('#showLogsSwitch').click(function () {
            let show = $('#showLogsSwitch').prop("checked");
            if (show) {
                $('#logsContainer').show();
            }
            else {
                $('#logsContainer').hide();
            }

        });

        $('#switchContentButton').click(function () {
            _this.myHoursApi.addLog(_this.options.contentSwitchProjectId, "content switch", _this.options.contentSwitchZoneReEnterTime)
                .then(
                    function (data) {
                        var notificationOptions = {
                            type: 'basic',
                            iconUrl: './images/TS-badge.png',
                            title: 'Content Switch',
                            message: 'Content Switch was recorded.'
                        };
                        chrome.notifications.create('optionsSaved', notificationOptions, function () { });
                    },
                    function (error) {
                        console.log(error);
                    });
        });

        document.onkeyup = function (event) {
            if (event.keyCode === 37) {
                _this.currentDate = _this.currentDate.add(-1, 'days');
                getLogs();
            }
            else if (event.keyCode === 39) {
                _this.currentDate = _this.currentDate.add(1, 'days');
                getLogs();
            }
            else if (event.keyCode === 32) {
                _this.currentDate = _this.currentDate = moment().startOf('day');
                getLogs();
            }
        };
    }


    function showLoginPage() {
        $('body').addClass('narrow');
        $('body').removeClass('wide');

        $('#mainContainer').hide();
        $('#mainContainer').hide();
        $('#loginContainer').show();

        if (_this.currentUser.email != undefined) {
            $('input#email').val(_this.currentUser.email);
        }

        $('#password').focus();

    }

    function showOptionsPage() {
        chrome.runtime.openOptionsPage();
    }

    function showMainPage() {
        $('body').removeClass('narrow');
        $('body').addClass('wide');

        $('#mainContainer').show();
        $('#loginContainer').hide();
        $('#loadingContainer').hide();
        $('#usersName').text(_this.currentUser.name);

        getLogs();

    }

    function showLoadingPage() {
        $('body').removeClass('narrow');
        $('body').addClass('wide');

        $('#mainContainer').hide();
        $('#loginContainer').hide();
        $('#loadingContainer').show();

    }

    function showHomePage() {
        $('#mainContainer').hide();
        $('#homeContainer').show();
        getCurrentBalance();
    }

    function drawTimeLineTimes(timelineContainer) {
        for (var i = 1; i <= 24; i++) {
            var tickColor = "lightgray";
            if (i % 6 == 0)
                tickColor = "#474747";


            var tick = $('<div>').css({
                left: (i * 60) / 1440 * _this.timeLineWidth + 'px',
                "background-color": tickColor,
            });
            tick.addClass('timeline-tick');
            tick.prop('title', i);
            timelineContainer.append(tick);

            var time = $('<div>').css({
                left: ((i * 60) / 1440 * _this.timeLineWidth) - 10 + 'px',
            });
            time.addClass('timeline-time')
            time.text(i);
            timelineContainer.append(time);
        }
    }

    function getLogs() {
        console.log('getting logs');
        _this.timeRatio.reset();
        _this.timeRatioAllHourAxo.reset();
        clearRatio();
        //hideAlert();

        var topContainer = $('#topContainer');
        topContainer.scrollLeft(300);

        var timeline = $('#timeline');
        timeline.empty();
        drawTimeLineTimes(timeline);

        var colors = ['#F44336', '#E91E63', "#9C27B0", "#673AB7", "#3F51B5", "#2196F3", "#4CAF50", "#FFC107"];

        $('.date').text(_this.currentDate.format('dddd, DD.MMM'));

        $('#ahAttendance').text(_this.noTimeDataText);
        $('#axoTotal').text(_this.noTimeDataText);
        $('#mhTotal').text(_this.noTimeDataText);

        var logsContainer = $('#logs');
        logsContainer.empty();

        _this.axoSoftApi.getWorkLogMinutesWorked(_this.currentDate).then(function (minutesWorked) {
            console.info(minutesWorked);
            $("#axoTotal").text(minutesToString(minutesWorked));
            _this.timeRatioAllHourAxo.setMyHours(minutesWorked);

        })
            .catch(error => {
                console.log(error);
                showAlert('could not connect to Axo.');
            });


        _this.axoSoftApi.getWorkLogTypes()
            .then(response => {
                _this.worklogTypes = response;

                _this.axoSoftApi.getTimeUnits().then(function (response) {
                    _this.timeUnits = response;

                    getAllHoursData();
                    var logsContainer2 = $('#logsContainer');

                    _this.myHoursApi.getLogs(_this.currentDate).then(
                        function (logs) {
                            _this.myHoursLogs = logs;
                            _this.myHoursTaskSummary = {};

                            var totalMins = 0;

                            logsContainer2.toggleClass('d-none', _this.myHoursLogs.length === 0);
                            topContainer.toggleClass('d-none', _this.myHoursLogs.length === 0);

                            $.each(_this.myHoursLogs, function (index, data) {
                                //var colorIndex = nameToIndex(data.projectName, 8);
                                //var colorIndex = numberToIndex(data.projectId, 8);
                                //var logColor = colors[colorIndex];

                                totalMins = totalMins + (data.duration / 60);

                                var log = $('<div>')
                                    .attr("data-logId", data.id)
                                    .addClass("d-flex logContainer my-1 p-1 align-items-center");

                                var columnColorBar = $('<div>')
                                    .addClass('columnColorBar rounded mr-2');


                                var columnMain = $('<div>')
                                    .addClass('mainColumn columnMain d-flex flex-column');

                                var columnAxoWorklogType = $('<div>')
                                    .addClass('axoWorklogTypeColumn');

                                columnMain.append(columnAxoWorklogType);



                                log.mouseenter(function () {
                                    $('#timeline .timeline-log[data-logId="' + data.id + '"]').toggleClass("active", true);
                                    $('#timeline .timeline-log').not('[data-logId="' + data.id + '"]').toggleClass("deactivate", true);
                                    hiLiteMyHoursLog(data.id);
                                });
                                log.mouseleave(function () {
                                    $('#timeline .timeline-log[data-logId="' + data.id + '"]').toggleClass("active", false);
                                    $('#timeline .timeline-log').not('[data-logId="' + data.id + '"]').toggleClass("deactivate", false);
                                    hiLiteMyHoursLog();
                                });

                                var worklogTypeInfo = $('<div>')
                                    .addClass('text-muted text-lowercase worklogType')
                                    .css('font-size', '0.7rem');

                                columnAxoWorklogType.append(worklogTypeInfo);

                                var columnTime = $('<div>')
                                    .addClass('columnTime text-right');
                                //.css('text-align', 'right')
                                //.css('font-weight', '600');

                                if (data.duration != null) {
                                    var duration = minutesToString(data.duration / 60);
                                    var durationInfo = $('<span>').text(duration);
                                    columnTime.append(durationInfo);
                                }
                                var columnStatus = $('<div>')
                                    .addClass('statusColumn ml-auto');

                                var status = ($('<div>')
                                    .addClass('tags columnStatus'));
                                columnStatus.append(status);

                                getAxoItem(data).then(item => {
                                    data.axoName = item.name;
                                    data.axoId = item.id;
                                    data.axoItemType = item.item_type;
                                    let remainingDurationIsAvailable = (item.remaining_duration.time_unit.id !== 0)

                                    if (remainingDurationIsAvailable) {
                                        data.axoRemainingDurationTimeUnitId = item.remaining_duration.time_unit.id;
                                        data.axoRemainingDuration = item.remaining_duration.duration;
                                        data.axoRemainingTimeMins = getRemainingMinutes(data.axoRemainingDurationTimeUnitId, data.axoRemainingDuration);
                                    }
                                    //data.color = colors[nameToIndex(data.axoName, 8)];
                                    data.color = colors[numberToIndex(data.axoId, 8)];
                                    columnColorBar.css("background-color", data.color);


                                    if (data.taskName) {
                                        let worklogTypeId = getWorklogTypeId(data.taskName, _this.worklogTypes, false);
                                        data.axoWorklogTypeId = worklogTypeId;
                                    }
                                    else {
                                        let partialWorkLogTypeName = getPartialWorkLogType(data);
                                        let worklogTypeId = getWorklogTypeId(partialWorkLogTypeName, _this.worklogTypes, true);
                                        data.axoWorklogTypeId = worklogTypeId;
                                    }
                                    let worklogTypeName = getWorklogTypeName(data.axoWorklogTypeId, _this.worklogTypes);
                                    data.axoWorklogTypeName = worklogTypeName;

                                    worklogTypeInfo.text(data.axoWorklogTypeName);



                                    var logStatus = $('*[data-logid="' + data.id + '"] .mainColumn');
                                    var truncatedAxoName = data.axoName; //truncateText(data.axoName, 50);
                                    var success = $('<div>')
                                        .addClass('axoItemName text-truncate')
                                        .text('' + data.axoId + " -- " + truncatedAxoName)
                                        //.css("background-color", data.color)
                                        //.css("color", "white")
                                        .click(function (event) {
                                            if (data.projectId && event.ctrlKey) {
                                                window.open(`https://app.myhours.com/#/projects/${data.projectId}/overview`, '_blank');
                                            }
                                        });

                                    if (data.note) {
                                        success.attr('title', data.note);
                                    }

                                    {
                                        var remainingHoursInfo = $('<span>').addClass('badge');

                                        if (remainingDurationIsAvailable) {
                                            var reminingHrs = Math.round(data.axoRemainingTimeMins / 60);
                                            remainingHoursInfo.text(reminingHrs + " hrs left");
                                        } else {
                                            remainingHoursInfo.addClass('badge-danger');
                                            remainingHoursInfo.text("enter estimate to sync");
                                        }
                                        status.append(remainingHoursInfo);
                                    }

                                    if (data.axoId) {
                                        var buttonCopyToAxo = $('<a title="copy to AXO woklog">')
                                            .addClass('btn roundButton')
                                            .click(function (event) {
                                                event.preventDefault();
                                                addAxoWorkLog(data);
                                            });
                                        buttonCopyToAxo.html('<i class="fas fa-seedling" aria-hidden="true"></i>');
                                        status.append(buttonCopyToAxo);
                                    }


                                    if (data.projectId) {
                                        var button = $('<a title="open My Hours project details">')
                                            .addClass('btn roundButton')
                                            .click(function (event) {
                                                event.preventDefault();
                                                window.open(`https://app.myhours.com/#/projects/${data.projectId}/overview`, '_blank');
                                            });
                                        button.html('<i class="fas fa-external-link-alt"></i>');
                                        status.append(button);
                                    }

                                    if (data.axoId) {
                                        var buttonOpenAxoItem = $('<a title="open AXO item">')
                                            .addClass('btn roundButton')
                                            .click(function (event) {
                                                event.preventDefault();
                                                window.open(`https://ontime.spica.com:442/OnTime/ViewItem.aspx?type=features&id=${data.axoId}`, '_blank');
                                            });
                                        buttonOpenAxoItem.html('<i class="fas fa-external-link-alt"></i>');
                                        status.append(buttonOpenAxoItem);
                                    }

                                    logStatus.append(success);
                                    getTimes(data, timeline);
                                },
                                    function (err) {
                                        var logStatus = $('*[data-logid="' + data.id + '"] .mainColumn .tags');
                                        logStatus.empty();
                                        var fail = $('<span>').addClass('tag is-light').html("<i class='fas fa-skull-crossbones mr-2'></i>Item was not found on Axo.<i class='fas fa-skull-crossbones ml-2'></i>");
                                        logStatus.append(fail);

                                        data.color = 'whitesmoke';
                                        getTimes(data, timeline);
                                    });

                                log.append(columnColorBar);
                                //log.append(columnAxoWorklogType);
                                log.append(columnMain);
                                log.append(columnTime);
                                log.append(columnStatus);

                                log.append(log);
                                logsContainer.append(log);
                            });
                            _this.timeRatio.setMyHours(totalMins);
                            $('#mhTotal').text(minutesToString(totalMins));

                            // let ahTopRange = moment.duration(totalMins / 0.9, 'minutes');
                            // let ahBottomRange = moment.duration(totalMins, 'minutes');
                            // $('#ahRange').text("[" + moment.utc(ahBottomRange.as('milliseconds')).format('HH:mm') + '-' + moment.utc(ahTopRange.as('milliseconds')).format('HH:mm') + ']');

                            $('#tasks').empty();
                            $.each(_this.myHoursTaskSummary, function (index, summary) {
                                let summaryHours = Math.round(summary / 60 / 60 * 100) / 100;

                                let taskCssClass = "is-info";
                                if (index == 'development' && summaryHours >= 4) {
                                    taskCssClass = "is-success"
                                } else if (index == 'development' && summaryHours < 1) {
                                    taskCssClass = "is-danger"
                                }

                                var taskControl = $('<div>').addClass('control');
                                var taskGroup = $('<div>').addClass('tags has-addons');
                                var taskName = $('<span>').text(index).addClass('tag is-dark').css("font-style", "italic");
                                var taskTime = $('<span>').text(minutesToString(summary / 60)).addClass('tag').addClass(taskCssClass);

                                taskGroup.append(taskName);
                                taskGroup.append(taskTime);

                                taskControl.append(taskGroup);

                                $('#tasks').append(taskControl);
                            });
                        },
                        function () {
                            console.info('failed to get logs');
                            showLoginPage();
                        }
                    );
                });

            })
            .catch(error => {
                console.log(error);
                showAlert('could not connect to Axo.');
            });

    }

    function getTimes(data, timeline) {
        _this.myHoursApi.getTimes(data.id).then(
            function (times) {
                $.each(times, function (index, time) {
                    var left = timeToPixel(time.startTime, _this.timeLineWidth);
                    var right = timeToPixel(time.endTime, _this.timeLineWidth);
                    //var timePeriod = intervalToString(time.startTime, time.endTime, time.duration);//minutesToString(time.duration / 60) + "h (" + moment(time.startTime).format('LT') + " - " + moment(time.endTime).format('LT') + ")";
                    // var title = intervalToString(time.startTime, time.endTime, time.duration) + ' // ' + data.projectName + ' // ' + data.taskName;
                    var title = intervalToString(time.startTime, time.endTime, time.duration) + ' -- ' + data.note;

                    var barGraph = $('<div>');
                    barGraph.addClass('timelineItem timeline-log');
                    barGraph.attr("data-logId", data.id);
                    barGraph.prop('title', title);

                    if (!data.axoId) {
                        barGraph.append('<i class="fas fa-skull-crossbones ml-2" aria-hidden="true"></i>');
                    }

                    // var leftDragHandle = $("<div class='leftDrag'>");
                    // leftDragHandle.mousedown(function (event) {
                    //     startDrag(event);
                    // });
                    // barGraph.append(leftDragHandle);

                    // var rightDragHandle = $("<div class='rightDrag'>");
                    // rightDragHandle.mousedown(function (event) {
                    //     startDrag(event);
                    // });
                    // barGraph.append(rightDragHandle);

                    barGraph.css({
                        left: left + 'px',
                        width: right - left + 'px',
                        "background-color": data.color,
                    });
                    barGraph.mouseenter(function () {
                        $('.logContainer[data-logId="' + data.id + '"]').toggleClass("active", true);
                        hiLiteMyHoursLog(data.id);
                    });
                    barGraph.mouseleave(function () {
                        $('.logContainer[data-logId="' + data.id + '"]').toggleClass("active", false);
                        hiLiteMyHoursLog();
                    });

                    timeline.append(barGraph);
                    //barGraph.tooltip();
                });
            }
        );


    }


    function getAllHoursData() {
        let currentUserPromise = _this.allHoursApi.getCurrentUserId();

        if (currentUserPromise != undefined) {
            currentUserPromise.then(
                function (data) {

                    if (data) {
                        _this.allHoursApi.getAttendance(data, _this.currentDate).then(
                            function (data) {
                                if (data && data.CalculationResultValues.length > 0) {
                                    let attendance = parseInt(data.CalculationResultValues[0].Value, 10);
                                    _this.timeRatio.setAllHours(attendance);
                                    _this.timeRatioAllHourAxo.setAllHours(attendance);
                                    $('#ahAttendance').text(minutesToString(attendance));
                                }
                            },
                            function (error) {
                                console.error('error while geeting attendance.');
                            }
                        );

                        _this.allHoursApi.getUserCalculations(data, _this.currentDate, _this.currentDate.clone()).then(
                            function (data) {
                                if (data && data.DailyCalculations.length > 0) {
                                    let segments = data.DailyCalculations[0].CalculationResultSegments;
                                    var timeline = $('#timeline');

                                    console.group('all hours segments');
                                    console.table(segments);
                                    console.groupEnd();

                                    $.each(segments, function (index, segment) {
                                        if (segment.Type === 4 && segment.StartTime && segment.StartTime.trim() !== "") {
                                            var left = timeToPixel(segment.StartTime, _this.timeLineWidth);
                                            var right = timeToPixel(segment.EndTime, _this.timeLineWidth);

                                            //var timePeriod = intervalToString(segment.startTime, segment.endTime, segment.duration)

                                            var barGraph = $('<div>');
                                            //barGraph.prop('data-tippy-content', 'All Hours paid time <br/>' + timePeriod);
                                            barGraph.addClass('allHoursSegment timelineItem');
                                            barGraph.prop('title', intervalToString(segment.StartTime, segment.EndTime, segment.Value));
                                            barGraph.css({
                                                left: left + 'px',
                                                width: right - left + 'px',
                                            });
                                            barGraph.addClass('timeline-segment')

                                            timeline.append(barGraph);
                                            //set tooltips
                                            //barGraph.tooltip();
                                            //tippy('.allHoursSegment');

                                        }
                                    });

                                }
                            },
                            function (error) {
                                console.error('error while geeting calculation.');
                            }
                        );
                    }
                })
                .catch(error => {
                    $('#ahAttendance').text('error logging in');
                    //showAlert('error logging to AH');
                    console.error('error while getting the AH current. token may be expired');
                })
        }
        else {
            $('#ahAttendance').text('error logging in');
            //showAlert('error logging to AH');
        }
    }

    function getCurrentBalance() {
        $('#currentBalancePlan').text('-');
        $('#currentBalanceAttendance').text('-');
        $('#currentBalanceRunning').text('-');
        $('#currentBalanceDiff').text('-');
        $('currentVacationDays').text('-');

        let currentUserPromise = _this.allHoursApi.getCurrentUserId();

        if (currentUserPromise != undefined) {
            currentUserPromise.then(
                function (data) {
                    var userId = data;

                    if (data) {
                        var today = moment().startOf('day');

                        _this.allHoursApi.getCurrentBalance(data).then(
                            function (data) {
                                var currentBalance = parseInt(data.CurrentBalanceMinutes);
                                drawDayBalanceChart(userId, today, currentBalance);

                                console.log(data.CurrentBalanceMinutes);
                                $('#currentBalanceDiff').text(minutesToString(currentBalance, true));
                                $('#homeGreeting>h5').text(data.Greeting);
                                $('#currentVacationDays').text(data.VacationBalance);

                                _this.allHoursApi.getUserCalculations(userId, today, today.clone()).then(
                                    function (data) {

                                        //
                                        let dayCalc = data.DailyCalculations[0];

                                        //day balance
                                        var currentBalanceAlternation = 0;
                                        var dayDiff = dayCalc.Accruals.filter(x => x.CalculationResultTypeCode == 4);
                                        if (dayDiff.length > 0) {
                                            let dayDiffValue = parseInt(dayDiff[0].Value);
                                            currentBalanceAlternation = currentBalance - dayDiffValue;

                                            // $('#currentBalanceDiff').text(minutesToString(parseInt(dayDiff[0].Value)));
                                        }


                                        //plan
                                        var planAccrual = dayCalc.Accruals.filter(x => x.CalculationResultTypeCode == 1);
                                        if (planAccrual.length > 0) {
                                            $('#currentBalancePlan').text(minutesToString(parseInt(planAccrual[0].Value)));
                                        }

                                        //attendance
                                        var currentBalanceAttendance = 0;
                                        var planAttendance = dayCalc.Accruals.filter(x => x.CalculationResultTypeCode == 33);
                                        if (planAttendance.length > 0) {
                                            let planAttendanceValue = parseInt(planAttendance[0].Value);
                                            currentBalanceAttendance = planAttendanceValue + currentBalanceAlternation;
                                        } else if (currentBalanceAlternation != 0) {
                                            currentBalanceAttendance = currentBalanceAlternation;
                                        }
                                        $('#currentBalanceAttendance').text(minutesToString(currentBalanceAttendance));

                                        //running balance
                                        var runningBalance = dayCalc.Accruals.filter(x => x.CalculationResultTypeCode == 24);
                                        if (runningBalance.length > 0) {
                                            let runningBalanceValue = parseInt(runningBalance[0].Value);
                                            runningBalanceValue = runningBalanceValue + currentBalanceAlternation;

                                            $('#currentBalanceRunning').text(minutesToString(runningBalanceValue, true));
                                        }


                                        

                                        

                                    },
                                    function (error) {
                                        console.error('error while geeting attendance.');
                                    }
                                );


                            },
                            function (error) {
                                console.error('error while geeting attendance.');
                            }
                        );





                        drawClockingsHeatMap(userId, today);

                    }
                })
                .catch(error => {
                    $('#currentBalanceMinutes').text('error logging in');
                    //showAlert('error logging to AH');
                    console.error('error while getting the AH current. token may be expired');
                })
        }
        else {
            $('#currentBalanceMinutes').text('error logging in');
            //showAlert('error logging to AH');
        }


    }


    function drawDayBalanceChart(userId, today, currentAttendance) {
        var tenDaysAgo = today.clone().add(-14, 'day');

        _this.allHoursApi.getUserCalculations(userId, tenDaysAgo, today.clone().add(-1, 'day')).then(
            function (data) {
                var dayDifferences = data.DailyCalculations.map(x => x.CalculationResultSummary.DailyBalanceValue);
                dayDifferences.push(currentAttendance);

                var runningDifferences = data.DailyCalculations.map(x => x.CalculationResultSummary.RunningBalanceValue);

                // var labels = data.DailyCalculations.map(x => moment(x.DateTime).format('ddd'));
                // labels.push(today.format('ddd'));

                var labels = data.DailyCalculations.map(x => moment(x.DateTime));
                labels.push(today);

                var dailyCtx = document.getElementById('dayBalanceChart').getContext('2d');
                var dailyChart = new Chart(dailyCtx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            data: dayDifferences,
                        },
                            // {
                            //     data: runningDifferences, 
                            // }
                        ]
                    },
                    options: {
                        legend: {
                            display: false
                        },
                        scales: {
                            xAxes: [{
                                gridLines: {
                                    drawBorder: false,
                                    display: false
                                },
                                ticks: {
                                    // maxTicksLimit: 7,
                                    display: false, //this removed the labels on the x-axis
                                },
                            }],
                            yAxes: [{
                                gridLines: {
                                    drawBorder: false,
                                    display: false
                                },
                                ticks: {
                                    // maxTicksLimit: 7,
                                    display: false, //this removed the labels on the x-axis
                                },
                            }]
                        },
                        tooltips: {
                            displayColors: false,
                            callbacks: {
                                title: function (tooltipItem, data) {
                                    return tooltipItem[0].xLabel.format('dddd, LL');
                                    //return value.format('dddd');
                                },
                                label: function (tooltipItem, data) {
                                    let value = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
                                    return minutesToString(value, true);
                                }
                            }
                        }
                    }
                });

                /*
                var runningDifferences = data.DailyCalculations.map(x => x.CalculationResultSummary.RunningBalanceValue);
                //runningDifferences.push(currentAttendance);
                var labels = data.DailyCalculations.map(x => moment(x.DateTime).format('ddd'));
                //labels.push(today.format('ddd'));
                var runningCtx = document.getElementById('runningBalanceChart').getContext('2d');
                var runningChart = new Chart(runningCtx, {
                    type: 'line',
                    data: {
                        labels: labels, 
                        datasets: [{
                            data: runningDifferences, 
                        }]
                    },
                    options: {
                        legend: {
                            display: false
                        },
                        scales: {
                            xAxes: [{
                                gridLines: {
                                    drawBorder: false,
                                    display: false
                                },
                                ticks: {
                                    // maxTicksLimit: 7,
                                    display: false, //this removed the labels on the x-axis
                                },
                            }],
                            yAxes: [{
                                gridLines: {
                                    drawBorder: false,
                                    display: false
                                },
                                ticks: {
                                    // maxTicksLimit: 7,
                                    display: false, //this removed the labels on the x-axis
                                },
                            }]
                        }
                    }
                });                
*/

            }
        );
    }

    /*
    function drawAxoAhRatioChart(ratio) {
        var chartCtx = document.getElementById('axoAhRatioChart').getContext('2d');

        var axoPartColor = "green";
        if (ratio === undefined){
            ratio = 0;
            axoPartColor = "red";
        }
        if (ratio < 0.9) {
            axoPartColor = "red";
        }
        if (ratio > 1) {
            axoPartColor = "red";
            ratio = 1
        }

        var cutOut = 0.30;
        var axoPart = ratio * (1-cutOut);
        var missingPart = 1 - axoPart - cutOut;



        var colors = [axoPartColor, "grey", "#2c314f"];
        var data = {
            datasets: [{
                data: [axoPart, missingPart, cutOut],
                backgroundColor: colors,
                borderColor: colors,
                labels: [
                    'Axo',
                    'missing',
                    'cutout'
                ],
                
            }]
        };

        var myDoughnutChart = new Chart(chartCtx, {
            type: 'doughnut',
            data: data,
            options: {
                cutoutPercentage: 85,
                rotation: 2 * Math.PI * 0.4,
                legend: {
                    display: false
                }
            }
        });
    }
    */

    function drawClockingsHeatMap(userId, today) {
        var tenDaysAgo = today.clone().add(-2, 'day');

        // var geoData = {
        //     type: "FeatureCollection",
        //     features: []
        // };

        var clockingsGeoData = [];

        //https://developer.here.com/blog/an-introduction-to-geojson

        _this.allHoursApi.getUserClockings(userId, tenDaysAgo, today.clone().add(-1, 'day')).then(

            function (data) {
                data.filter(x => x.Latitude).map(x => {
                    clockingsGeoData.push(L.latLng(x.Latitude, x.Longitude));

                    // geoData.features.push({
                    //     type: "Feature",
                    //     geometry: {
                    //         type: "Point",
                    //         coordinates: [ x.Longitude, x.Latitude ]
                    //     },
                    //     properties: {
                    //         userName: x.UserFullName
                    //     }
                    // })
                });


                // don't forget to include leaflet-heatmap.js
                var testData = {
                    max: 1,
                    data: clockingsGeoData
                };

                var baseLayer = L.tileLayer(
                    'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '...',
                    maxZoom: 18
                }
                );

                var cfg = {
                    // radius should be small ONLY if scaleRadius is true (or small radius is intended)
                    // if scaleRadius is false it will be the constant radius used in pixels
                    "radius": 2,
                    "maxOpacity": .8,
                    // scales the radius based on map zoom
                    "scaleRadius": true,
                    // if set to false the heatmap uses the global maximum for colorization
                    // if activated: uses the data maximum within the current map boundaries
                    //   (there will always be a red spot with useLocalExtremas true)
                    "useLocalExtrema": true,
                    // which field name in your data represents the latitude - default "lat"
                    latField: 'lat',
                    // which field name in your data represents the longitude - default "lng"
                    lngField: 'lng',
                    // which field name in your data represents the data value - default "value"
                    valueField: 'count'
                };



                /*
                                var map = new L.Map('map-canvas', {
                                    center: new L.LatLng(25.6586, -80.3568),
                                    zoom: 4,
                                    layers: [baseLayer, heatmapLayer]
                                });
                
                                var heatmapLayer = new HeatmapOverlay(cfg);
                                heatmapLayer.addTo(map);
                                heatmapLayer.setData(testData);
                
                
                */

                //let firstGeoPoint = geoData.features[0];
                /*let firstGeoPoint = clockingsGeoData[0];

                /*
                var mymap = L.map('map').setView([51.505, -0.09], 13);
                L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
                    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
                    maxZoom: 18,
                    id: 'mapbox/streets-v11',
                    tileSize: 512,
                    zoomOffset: -1,
                    accessToken: 'pk.eyJ1IjoiZGF2aWRzYWtlbHNlayIsImEiOiIzM2ExRklBIn0.mx4QxSrjca5HAkaH9SVDuA'
                }).addTo(mymap);
                */

                // L.map('map').setView([firstGeoPoint.geometry.coordinates[0], firstGeoPoint.geometry.coordinates[1]], 13);


                // don't forget to include leaflet-heatmap.js
                /*
                var testData = {
                    max: 8,
                    data: [{ lat: 24.6408, lng: 46.7728, count: 3 }, { lat: 50.75, lng: -1.55, count: 1 }]
                };

                var baseLayer = L.tileLayer(
                    'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '...',
                    maxZoom: 18
                }
                );


/*
                
                var cfg = {
                    // radius should be small ONLY if scaleRadius is true (or small radius is intended)
                    // if scaleRadius is false it will be the constant radius used in pixels
                    "radius": 2,
                    "maxOpacity": .8,
                    // scales the radius based on map zoom
                    "scaleRadius": true,
                    // if set to false the heatmap uses the global maximum for colorization
                    // if activated: uses the data maximum within the current map boundaries
                    //   (there will always be a red spot with useLocalExtremas true)
                    "useLocalExtrema": true,
                    // which field name in your data represents the latitude - default "lat"
                    latField: 'lat',
                    // which field name in your data represents the longitude - default "lng"
                    lngField: 'lng',
                    // which field name in your data represents the data value - default "value"
                    valueField: 'count'
                };
                

                /*
                var L = require('leaflet');
                var HeatmapOverlay = require('leaflet-heatmap');
                
                var heatmapLayer = new HeatmapOverlay(cfg);
                */

                /*
                var map = new L.Map('map', {
                    center: new L.LatLng(25.6586, -80.3568),
                    zoom: 4,
                    layers: [baseLayer]
                });

                var heatmapLayer = new HeatmapOverlay(cfg).addTo(map);
                heatmapLayer.setData(testData);

                /*
                // minimal heatmap instance configuration
                var heatmapInstance = h337.create({
                    // only container is required, the rest will be defaults
                    container: document.querySelector('#map')
                });

                // L.tileLayer('http://tiles.mapc.org/basemap/{z}/{x}/{y}.png',
                // {
                //   attribution: 'Tiles by <a href="http://mapc.org">MAPC</a>, Data by <a href="http://mass.gov/mgis">MassGIS</a>',
                //   maxZoom: 17,
                //   minZoom: 9
                // }).addTo(heatmapInstance);                

                // now generate some random data
                var points = [];
                var max = 0;
                var width = 840;
                var height = 400;
                var len = 200;

                while (len--) {
                    var val = Math.floor(Math.random() * 100);
                    max = Math.max(max, val);
                    var point = {
                        x: Math.floor(Math.random() * width),
                        y: Math.floor(Math.random() * height),
                        value: val
                    };
                    points.push(point);
                }
                // heatmap data format
                var data = {
                    max: max,
                    data: points
                };
                // if you have a set of datapoints always use setData instead of addData
                // for data initialization
                heatmapInstance.setData(data);
                */


                //map.addLayer(heatmapInstance);






                // var heat = L.heatLayer(clockingsGeoData, { radius: 35 });
                // map.addLayer(heat);




                //heatmapLayer.setData(testData);


            })
    }

    function initMap() {
        map.on('load', function () {
            // Add a geojson point source.
            // Heatmap layers also work with a vector tile source.
            map.addSource('earthquakes', {
                'type': 'geojson',
                'data':
                    'https://docs.mapbox.com/mapbox-gl-js/assets/earthquakes.geojson'
            });

            map.addLayer(
                {
                    'id': 'earthquakes-heat',
                    'type': 'heatmap',
                    'source': 'earthquakes',
                    'maxzoom': 9,
                    'paint': {
                        // Increase the heatmap weight based on frequency and property magnitude
                        'heatmap-weight': [
                            'interpolate',
                            ['linear'],
                            ['get', 'mag'],
                            0,
                            0,
                            6,
                            1
                        ],
                        // Increase the heatmap color weight weight by zoom level
                        // heatmap-intensity is a multiplier on top of heatmap-weight
                        'heatmap-intensity': [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            0,
                            1,
                            9,
                            3
                        ],
                        // Color ramp for heatmap.  Domain is 0 (low) to 1 (high).
                        // Begin color ramp at 0-stop with a 0-transparancy color
                        // to create a blur-like effect.
                        'heatmap-color': [
                            'interpolate',
                            ['linear'],
                            ['heatmap-density'],
                            0,
                            'rgba(33,102,172,0)',
                            0.2,
                            'rgb(103,169,207)',
                            0.4,
                            'rgb(209,229,240)',
                            0.6,
                            'rgb(253,219,199)',
                            0.8,
                            'rgb(239,138,98)',
                            1,
                            'rgb(178,24,43)'
                        ],
                        // Adjust the heatmap radius by zoom level
                        'heatmap-radius': [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            0,
                            2,
                            9,
                            20
                        ],
                        // Transition from heatmap to circle layer by zoom level
                        'heatmap-opacity': [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            7,
                            1,
                            9,
                            0
                        ]
                    }
                },
                'waterway-label'
            );

            map.addLayer(
                {
                    'id': 'earthquakes-point',
                    'type': 'circle',
                    'source': 'earthquakes',
                    'minzoom': 7,
                    'paint': {
                        // Size circle radius by earthquake magnitude and zoom level
                        'circle-radius': [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            7,
                            ['interpolate', ['linear'], ['get', 'mag'], 1, 1, 6, 4],
                            16,
                            ['interpolate', ['linear'], ['get', 'mag'], 1, 5, 6, 50]
                        ],
                        // Color circle by earthquake magnitude
                        'circle-color': [
                            'interpolate',
                            ['linear'],
                            ['get', 'mag'],
                            1,
                            'rgba(33,102,172,0)',
                            2,
                            'rgb(103,169,207)',
                            3,
                            'rgb(209,229,240)',
                            4,
                            'rgb(253,219,199)',
                            5,
                            'rgb(239,138,98)',
                            6,
                            'rgb(178,24,43)'
                        ],
                        'circle-stroke-color': 'white',
                        'circle-stroke-width': 1,
                        // Transition from heatmap to circle layer by zoom level
                        'circle-opacity': [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            7,
                            0,
                            8,
                            1
                        ]
                    }
                },
                'waterway-label'
            );
        });
    }


    function login(email, password) {
        _this.myHoursApi.getAccessToken(email, password).then(
            function (token) {
                //var currentUser = new CurrentUserRepo.getInstance();
                _this.currentUser.email = email;
                _this.currentUser.setTokenData(token.accessToken, token.refreshToken);
                _this.currentUser.save();

                //myHoursApi.accessToken = token.accessToken;
                _this.myHoursApi.getUser().then(function (user) {
                    _this.currentUser.setUserData(user.id, user.name);
                    _this.currentUser.save();
                    showMainPage();
                }, function (err) {
                    console.info('error while geeting the user data');
                    showLoginPage();
                });

            },
            function (error) {
                console.info('error while geeting the access token');
                showLoginPage();
            }
        )
    }

    function getRemainingMinutes(timeUnitId, duration) {
        let timeUnit = _.find(_this.timeUnits, function (t) {
            return t.id === timeUnitId;
        });
        return timeUnit.conversion_factor * duration;
    }

    function addAxoWorkLog(myHoursLog) {

        var logStatus = $('*[data-logid="' + myHoursLog.id + '"] .statusColumn .tags');
        logStatus.empty();

        //getAxoItem(myHoursLog).then(item => {

        if (myHoursLog.duration === 0) {
            logStatus.append('<span>').addClass('tag is-warning').text("empty log. skipping.");
            return;
        }

        if (!myHoursLog.axoId) {
            logStatus.append('<span>').addClass('tag is-danger').text("axo item not found");
            return;
        }

        console.info('copy to axo: item Id' + myHoursLog.axoId);
        console.info(myHoursLog);

        var worklog = new Worklog;
        worklog.user.id = parseInt(_this.options.axoSoftUserId);
        worklog.work_done.duration = myHoursLog.duration / 60; // mins
        worklog.item.id = myHoursLog.axoId;
        worklog.item.item_type = myHoursLog.axoItemType; //item.item_type;
        worklog.work_log_type.id = myHoursLog.axoWorklogTypeId;
        worklog.description = myHoursLog.note;
        worklog.date_time = moment(myHoursLog.date).add(8, 'hours').toDate();

        //calc remaining time
        /*
        var timeUnit = _.find(_this.timeUnits, function (t) {
            return t.id === myHoursLog.axoRemainingDurationTimeUnitId; //item.remaining_duration.time_unit.id
        });
        var remainingTimeMins = timeUnit.conversion_factor * myHoursLog.axoRemainingDuration //item.remaining_duration.duration;
*/
        let remainingTimeMins = getRemainingMinutes(myHoursLog.axoRemainingDurationTimeUnitId, myHoursLog.axoRemainingDuration);

        worklog.remaining_time.duration = Math.max(remainingTimeMins - worklog.work_done.duration, 0);

        _this.axoSoftApi.addWorkLog(worklog)
            .then(
                function () {
                    console.info('worklog added');
                    var success = $('<span>').addClass('tag');
                    var reminingHrs = Math.round(worklog.remaining_time.duration / 60);
                    if (reminingHrs > 0) {
                        success.addClass('is-success')
                    } else {
                        success.addClass('is-warning')
                    }
                    success.text(reminingHrs + " hrs left");

                    logStatus.append(success);
                    //logStatus.append('<span>').addClass('tag is-success').text("OK -- " + +" hrs left");
                }
            )
            .catch(
                function () {
                    logStatus.append('<span>').addClass('tag is-danger').text("error adding log").css('color: red');
                    console.info('worklog add failed');
                }
            )

    }

    function getAxoItem(myHoursLog) {
        let itemNumberRegEx = new RegExp('^[0-9]*');
        if (myHoursLog.projectName != null) {
            let regExResults = itemNumberRegEx.exec(myHoursLog.projectName);
            if (regExResults && regExResults.length > 0 && regExResults[0] !== '') {
                return _this.axoSoftApi.getFeatureItem(regExResults[0]);
            }
        }

        if (myHoursLog.note != null) {
            let regExResults = itemNumberRegEx.exec(myHoursLog.note);

            if (regExResults && regExResults.length > 0 && regExResults[0] !== '') {
                //remove id from the note 
                myHoursLog.note = myHoursLog.note.replace(itemNumberRegEx, '');
                return _this.axoSoftApi.getFeatureItem(regExResults[0]);
            }
        }
        return Promise.reject(new Error('project not found'));
    }

    function getPartialWorkLogType(myHoursLog) {
        let workLogTypeRegEx = new RegExp('^\/[A-Za-z]*');
        if (myHoursLog.note != null) {

            let regExResults = workLogTypeRegEx.exec(myHoursLog.note);

            if (regExResults && regExResults.length > 0 && regExResults[0] !== '') {
                // remove id from the note 
                myHoursLog.note = myHoursLog.note.replace(workLogTypeRegEx, '').trim();
                return regExResults[0].substr(1);
            }
        }
        return '';
    }

    function copyTimelogs() {
        console.info(_this.myHoursLogs);

        if (_this.options.axoSoftUserId == undefined) {
            $('#alertContainer').show();
            $('#alertContainer div.alert').text("AxoSoft user not defined. Check settings.");
        }
        else {
            $('#alertContainer').hide();
            $('#axoNotAccessible').hide();
            try {
                $.each(_this.myHoursLogs, function (index, myHoursLog) {
                    addAxoWorkLog(myHoursLog);
                });
            } catch (e) {
                $('#axoNotAccessible').show();
            }
        }
    }

    function getWorklogTypeId(taskName, worklogTypes, partialMatch) {
        if (taskName != undefined) {
            var workLogType = _.find(worklogTypes,
                function (w) {
                    if (!partialMatch) {
                        return w.name.toUpperCase() === taskName.toUpperCase();
                    }
                    else {
                        return w.name.toUpperCase().startsWith(taskName.toUpperCase());
                    }
                });

            if (workLogType != undefined) {
                return workLogType.id;
            }
        }
        return _this.options.axoSoftDefaultWorklogTypeId;
    }

    function getWorklogTypeName(id, worklogTypes) {
        var workLogType = _.find(worklogTypes,
            function (w) {
                return w.id.toString() === id.toString();
            });

        if (workLogType) {
            return workLogType.name;
        }
        return 'unknown worklog type'
    }

    function truncateText(text, maxLength) {
        if (text.length > maxLength) {
            return text.substring(0, maxLength) + '...';
        }
        return text;
    }

    function timeToPixel(date, fullLength) {
        var mmt = moment(date);
        var mmtMidnight = mmt.clone().startOf('day');
        var diffMinutes = mmt.diff(mmtMidnight, 'minutes');

        return Math.round(diffMinutes / 1440 * fullLength);

    }

    function minutesToString(minutes, showSign) {
        let sign = Math.sign(minutes);

        minutes = Math.abs(minutes);

        let duration = moment.duration(minutes, 'minutes');
        let minutesString = (duration.days() * 24) + duration.hours() + ':' + duration.minutes().toString().padStart(2, '0');

        //console.log('format minutes: ' + minutes + ' -> ' + minutesString);

        if (sign < 0) {
            minutesString = "-" + minutesString;
        }
        else if (showSign) {
            minutesString = "+" + minutesString;
        }
        return minutesString;

        //return (Math.round(minutes / 60 * 100) / 100) + "h";
    }

    function nameToIndex(s, length) {
        if (!s) {
            return 0;
        }
        let sumOfChars = s.split('').map(x => x.charCodeAt(0)).reduce((a, b) => a + b, 0);
        return sumOfChars % length;
    }

    function numberToIndex(num, length) {
        if (!num) {
            return 0;
        }
        return num % length;
    }

    function showRatio(ratio) {
        showRatioOnCard(ratio, $('#mhAhRatioText'));
    }

    function showRatioAllHoursAxo(ratio) {
        showRatioOnCard(ratio, $('#axoAhRatioText'));
        //drawAxoAhRatioChart(ratio);
    }

    function showRatioOnCard(ratio, element) {
        let elementInfo = $(element);
        elementInfo.removeClass('blink');
        if (ratio !== undefined){
            elementInfo.text((ratio * 100).toFixed(0) + '%');
            let ratioValid = (ratio >= 0.9 && ratio <= 1);
            elementInfo.toggleClass('blink', !ratioValid);
        }
        else {
            elementInfo.text('--');        
        }
    }    

    function clearRatio() {
        let elementCard = $('#timeRatioCard');
        elementCard.removeClass('bg-warning');

        let elementInfo = $('#timeRatio');
        elementInfo.text(_this.noNumberDataText);
    }

    function intervalToString(startTime, endTime, durationMinutes) {
        let interval = moment(startTime).format('LT') + " - " + moment(endTime).format('LT');
        return interval + ' (' + minutesToString(durationMinutes / 60) + 'h )';
    }

    function startDrag(e) {
        _this.isResizing = true;
        _this.lastDownX = e.clientX;
    }

    function showAlert(message) {
        $('#alertContainer span').text(message);
        $('#alertContainer').show();
    }


    function hideAlert() {
        $('#alertContainer').hide();
    }

    function hiLiteMyHoursLog(logId) {
        chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { type: 'hilite-log', logId });
        });
    }




    initInterface();
}