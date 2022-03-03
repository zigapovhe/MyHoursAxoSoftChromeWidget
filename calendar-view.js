'use strict'

function CalendarView(myHoursApi, viewContainer){
    var _this = this;
    _this.myHoursApi = myHoursApi;
    _this.viewContainer = viewContainer;
    _this.heatmapColors = ["#EEEEEE","#D6E77F","#8AC760","#40A43A","#19691F"];

    _this.show = function() {
        let today = moment().startOf('day');
        let startOfCalendar = today.clone().startOf('isoWeek').add(-39, 'week');
        let endOfCalendar = today.clone();

        _this.myHoursApi.getActivity(startOfCalendar, endOfCalendar).then(logs => {
            let minutesPerDayData = logs.reduce((accumulator, log) => {
                let key = log.date;
                if (key in accumulator) {
                    accumulator[key].duration = accumulator[key].duration + (log.logDuration / 60);
                }
                else {
                    accumulator[key] = {
                        duration: log.logDuration / 60,
                        date: moment(key).startOf('day')
                    }
                }
                return accumulator;
            }, {});

            let minutesPerDay = Object.entries(minutesPerDayData).map(x => x[1]);
    
            let totalMinutes = minutesPerDay.reduce((a, log) => a + log.duration, 0);
            viewContainer.find('.calendarItemsTotal').text(minutesToString(totalMinutes));

            let maxMinutesInDay = Math.max(...minutesPerDay.map(x => x.duration), 0);
            viewContainer.find('.calendarMaxMinutesInDay').text(minutesToString(maxMinutesInDay));
            
            let workDaysInRange = minutesPerDay.filter(x => x.date.isoWeekday() < 6).length;
            viewContainer.find('.calendarWorkDays').text(workDaysInRange);
            viewContainer.find('.calendarAverageMinutesInWorkDay').text(minutesToString(totalMinutes / workDaysInRange));

            let calendarContainer = $('#calendarChart');
            calendarContainer.empty();


            calendarContainer.append($('<div>'));
            calendarContainer.append($('<div>').addClass("calendar-day-name").text('Mon'));
            calendarContainer.append($('<div>'));
            calendarContainer.append($('<div>').addClass("calendar-day-name").text('Wed'));
            calendarContainer.append($('<div>'));
            calendarContainer.append($('<div>').addClass("calendar-day-name").text('Fri'));
            calendarContainer.append($('<div>'));
            calendarContainer.append($('<div>'));

            for (let currDay = startOfCalendar.clone(); currDay < endOfCalendar; currDay.add(1, 'day')) {
                if (currDay.isoWeekday() == 1){
                    let text = '';
                    for (let currWeekDay = currDay.clone(); currWeekDay < currDay.clone().endOf('isoWeek'); currWeekDay.add(1, 'day')) {
                        if (currWeekDay.date() == 1) {
                            text = currWeekDay.format('MMM');
                        }
                    }
                    calendarContainer.append($('<div>').addClass("calendar-day-name").text(text));
                }

                let minutes = minutesPerDay.find(x => x.date.isSame(currDay, 'day'))?.duration || 0;
                let heatmapColorIndex = Math.min(Math.ceil(minutes/(3*60)), 4);
                calendarContainer.append($('<div>')
                    .addClass("calendar-day")
                    .css("background-color", _this.heatmapColors[heatmapColorIndex])
                    .attr('title', `${currDay.format('ll')}: ${minutesToString(minutes)}`)
                    );
            }
        })
    }
}