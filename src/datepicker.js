import PICKER_CSS from "./picker.css";
import {parseLocaleDate, formatLocaleDate, repeat, localeWeekday, localeMonth} from "./util.js";

const IE = "ScriptEngineMajorVersion" in window;

export class DatePickerImpl {
    constructor(input, formatOptions) {
        this._input = input;
        this._formatOptions = formatOptions;

        this._initPicker();
    }

    _initPicker() {
        this._picker = document.createElement("dateinput-picker");
        this._picker.setAttribute("aria-hidden", true);

        const object = document.createElement("object");
        object.type = "text/html";
        object.width = "100%";
        object.height = "100%";
        // non-IE: must be BEFORE the element added to the document
        if (!IE) {
            object.data = "about:blank";
        }
        // load content when <object> is ready
        object.addEventListener("load", event => {
            this._initContent(event.target.contentDocument.body);
        });
        // add object element to the document
        this._picker.appendChild(object);
        // IE: must be AFTER the element added to the document
        if (IE) {
            object.data = "about:blank";
        }
        this._input.parentNode.insertBefore(this._picker, this._input);
    }

    _initContent(pickerBody) {
        const defaultYearDelta = 30;
        const now = new Date();
        const minDate = this._getLimitationDate("min");
        const maxDate = this._getLimitationDate("max");
        let startYear = minDate ? minDate.getFullYear() : now.getFullYear() - defaultYearDelta;
        let endYear = maxDate ? maxDate.getFullYear() : now.getFullYear() + defaultYearDelta;
        // append picker HTML to shadow dom
        pickerBody.innerHTML = `
<style>${PICKER_CSS}</style>
<header>
    <a role="button" rel="prev"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="100%" viewBox="0 0 16 16"><path d="M11.5 14.06L1 8L11.5 1.94z"/></svg></a>
    <time id="caption" aria-live="polite"></time>
    <a role="button" rel="next"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="100%" viewBox="0 0 16 16"><path d="M15 8L4.5 14.06L4.5 1.94z"/></svg></a>
</header>
<table role="grid" aria-labelledby="#caption">
    <thead id="weekdays">${repeat(7, (i) => `<th>${localeWeekday(i, this._formatOptions)}</th>`)}</thead>
    <tbody id="days">${`<tr>${'<td data-timestamp>'.repeat(7)}</tr>`.repeat(6)}</tbody>
</table>
<div aria-hidden="true" aria-labelledby="#caption">
    <ol id="months">${repeat(12, (i) => `<li data-month="${i}">${localeMonth(i, this._formatOptions)}`)}</ol>
    <ol id="years">${repeat(endYear - startYear + 1, (i) => {
        return `<li data-year="${startYear + i}">${startYear + i}</li>`;
    })}</ol>
</div>  `;

        this._caption = pickerBody.querySelector("[aria-live=polite]");
        this._pickers = pickerBody.querySelectorAll("[aria-labelledby]");

        pickerBody.addEventListener("mousedown", this._onMouseDown.bind(this));
        pickerBody.addEventListener("contextmenu", (event) => event.preventDefault());

        this.show();
    }

    _getLimitationDate(name) {
        if (this._input) {
            return parseLocaleDate(this._input.getAttribute(name));
        } else {
            return null;
        }
    }

    _onMouseDown(event) {
        const target = event.target;
        // disable default behavior so input doesn't loose focus
        event.preventDefault();
        // skip right/middle mouse button clicks
        if (event.button) return;

        if (target === this._caption) {
            this._togglePickerMode();
        } else if (target.matches("[role=button]")) {
            this._clickButton(target);
        } else if (target.matches("[data-timestamp]")) {
            this._clickDate(target);
        } else if (target.matches("[data-year],[data-month]")) {
            this._clickMonthYear(target);
        }
    }

    _clickButton(target) {
        const captionDate = this.getCaptionDate();
        const sign = target.matches('[rel=prev]') ? -1 : 1;
        const advancedMode = this.isAdvancedMode();
        if (advancedMode) {
            captionDate.setFullYear(captionDate.getFullYear() + sign);
        } else {
            captionDate.setMonth(captionDate.getMonth() + sign);
        }
        if (this.isValidValue(captionDate)) {
            this.render(captionDate);
            if (advancedMode) {
                this._input.valueAsDate = captionDate;
            }
        }
    }

    _clickDate(target) {
        if (target.getAttribute("aria-disabled") !== "true") {
            this._input.valueAsDate = new Date(+target.dataset.timestamp);
            this.hide();
        }
    }

    _clickMonthYear(target) {
        const month = +target.dataset.month;
        const year = +target.dataset.year;
        if (month >= 0 || year >= 0) {
            const captionDate = this.getCaptionDate();
            if (!isNaN(month)) {
                captionDate.setMonth(month);
            }
            if (!isNaN(year)) {
                captionDate.setFullYear(year);
            }
            if (this.isValidValue(captionDate)) {
                this._renderAdvancedPicker(captionDate, false);
                this._input.valueAsDate = captionDate;
            }
        }
    }

    _togglePickerMode() {
        this._pickers.forEach((element, index) => {
            const currentDate = this._input.valueAsDate || new Date();
            const hidden = element.getAttribute("aria-hidden") === "true";
            if (index === 0) {
                if (hidden) {
                    this._renderCalendarPicker(currentDate);
                }
            } else {
                if (hidden) {
                    this._renderAdvancedPicker(currentDate);
                }
            }
            element.setAttribute("aria-hidden", !hidden);
        });
    }

    _renderCalendarPicker(captionDate) {
        const now = new Date();
        const currentDate = this._input.valueAsDate;
        const minDate = this._getLimitationDate("min");
        const maxDate = this._getLimitationDate("max");
        const iterDate = new Date(captionDate.getFullYear(), captionDate.getMonth());
        // move to beginning of the first week in current month
        iterDate.setDate((this._formatOptions.hour12 ? 0 : iterDate.getDay() === 0 ? -6 : 1) - iterDate.getDay());

        this._pickers[0].querySelectorAll("td").forEach((cell) => {
            iterDate.setDate(iterDate.getDate() + 1);

            if (iterDate.getMonth() === captionDate.getMonth()) {
                if (
                    currentDate &&
                    iterDate.getMonth() === currentDate.getMonth() &&
                    iterDate.getDate() === currentDate.getDate()
                ) {
                    cell.setAttribute("aria-selected", true);
                } else {
                    cell.setAttribute("aria-selected", false);
                }
            } else {
                cell.removeAttribute("aria-selected");
            }

            if (
                iterDate.getFullYear() === now.getFullYear() &&
                iterDate.getMonth() === now.getMonth() &&
                iterDate.getDate() === now.getDate()
            ) {
                cell.setAttribute("aria-current", "date");
            } else {
                cell.removeAttribute("aria-current");
            }

            if ((minDate && iterDate < minDate) || (maxDate && iterDate > maxDate)) {
                cell.setAttribute("aria-disabled", true);
            } else {
                cell.removeAttribute("aria-disabled");
            }

            cell.textContent = iterDate.getDate();
            cell.dataset.timestamp = iterDate.getTime();
        });
        // update visible caption value
        this.setCaptionDate(captionDate);
    }

    _renderAdvancedPicker(captionDate, syncScroll = true) {
        this._pickers[1].querySelectorAll("[aria-selected]").forEach((selectedElement) => {
            selectedElement.removeAttribute("aria-selected");
        });

        if (captionDate) {
            const monthItem = this._pickers[1].querySelector(`[data-month="${captionDate.getMonth()}"]`);
            const yearItem = this._pickers[1].querySelector(`[data-year="${captionDate.getFullYear()}"]`);
            monthItem.setAttribute("aria-selected", true);
            yearItem.setAttribute("aria-selected", true);
            if (syncScroll) {
                monthItem.parentNode.scrollTop = monthItem.offsetTop;
                yearItem.parentNode.scrollTop = yearItem.offsetTop;
            }
            // update visible caption value
            this.setCaptionDate(captionDate);
        }
    }

    isValidValue(dateValue) {
        const minDate = this._getLimitationDate("min");
        const maxDate = this._getLimitationDate("max");
        return !((minDate && dateValue < minDate) || (maxDate && dateValue > maxDate));
    }

    isAdvancedMode() {
        return this._pickers[0].getAttribute("aria-hidden") === "true";
    }

    getCaptionDate() {
        return new Date(this._caption.getAttribute("datetime"));
    }

    setCaptionDate(captionDate) {
        this._caption.textContent = captionDate.toLocaleString(this._formatOptions.locale, {
            month: "long",
            year: "numeric",
        });
        this._caption.setAttribute("datetime", captionDate.toISOString());
    }

    show() {
        if (this._picker.getAttribute("aria-hidden") === "true") {
            const startElement = this._input;
            const rootElement = document.documentElement;
            const pickerOffset = this._picker.getBoundingClientRect();
            const inputOffset = startElement.getBoundingClientRect();
            // set picker position depending on current visible area
            let marginTop = inputOffset.height;
            if (rootElement.clientHeight < inputOffset.bottom + pickerOffset.height) {
                marginTop = -pickerOffset.height;
            }
            this._picker.style.marginTop = marginTop + "px";

            this._renderCalendarPicker(this._input.valueAsDate || new Date());
            // display picker
            this._picker.removeAttribute("aria-hidden");
        }
    }

    hide() {
        this._picker.setAttribute("aria-hidden", true);
        this.reset();
    }

    reset() {
        this._pickers.forEach((element, index) => {
            element.setAttribute("aria-hidden", !!index);
        });
    }

    render(captionDate) {
        if (this.isAdvancedMode()) {
            this._renderAdvancedPicker(captionDate);
        } else {
            this._renderCalendarPicker(captionDate);
        }
    }
}
