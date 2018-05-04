/**
 * Created by Usagi on 2018/5/3.
 */
;
(function () {
    var pubgMap = window.pubgMap = function (element, data, namespace) {

        var that = this;

        if (!element) {
            var ctr = document.createElement("div");
            ctr.id  = "pubg-map-container";
            document.body.appendChild(ctr);
            element = "#pubg-map-container";
        }


        var style       = document.createElement("style");
        style.innerText = "" +
            "* { padding: 0;margin: 0; border: 0;}" +
            element + " { position: relative; overflow: hidden;}" +
            ".pubgm-map-grid { position: absolute; left: 0; top: 0; overflow: hidden;}" +
            ".grids { width: 256px; height: 256px; background-position: 0 0; float: left; z-index: 8;}" +
            ".pubgm-map-canvas { position: absolute; left: 0; top: 0; z-index: 10; }";
        document.getElementsByTagName("head")[0].appendChild(style);

        this.lt      = 256;
        this.urlBase = "https://cdn.helper.qq.com/map/20004/erangel/";
        // this.mapElementJson = "https://cdn.helper.qq.com/map/20004/erangel.json";

        this.localStorageSuffix = "SHIYUMI_PUBG_DATA_" || (namespace + "_");
        this.currentWeight      = 3;
        this.maxWeight          = 5;
        this.minWeight          = 1;
        this.data               = data;
        this.mapContainer       = document.querySelector(element);
        this.imageCache         = {};
        this.canvasContextCache = {};

        this.measure_mode  = false;
        this.fixRatio      = 0.9778;
        this.distx         = 8000;
        this.disty         = 8000;
        this.measurePoints = [];
        this.markerStyle   = {
            font: "20px Microsoft Yahei",
            fillStyle: "white",
            strokeStyle: "black",
            textAlign: "center",
            lineWidth: 4,
        }
        this.centerXRatio  = 0;
        this.centerYRatio  = 0;
        this.centerXoffset = 0;
        this.centerYoffset = 0;


        this.mapGrid   = document.createElement("div");
        this.mapCanvas = document.createElement("canvas");

        this.mapGrid.className   = "pubgm-map-grid";
        this.mapCanvas.className = "pubgm-map-canvas";


        this.mapContainer.appendChild(this.mapGrid);
        this.mapGrid.appendChild(this.mapCanvas);

        this.mapGrid   = document.querySelector(".pubgm-map-grid");
        this.mapCanvas = document.querySelector(".pubgm-map-canvas");

        this.insertMapGridWrap = function () {
            var mapGridWrap       = document.createElement("div");
            mapGridWrap.className = "pubgm-map-grid-wrap";
            mapGridWrap.setAttribute("weight", this.currentWeight + "");
            this.mapGrid.appendChild(mapGridWrap);
        }


        this.getMapGridWrap = function (weight) {
            return document.querySelector("*[weight='" + weight + "']");
        }

        this.weightCache = [];

        function size() {
            that.mapContainer.style.width  = document.documentElement.clientWidth + "px";
            that.mapContainer.style.height = document.documentElement.clientHeight + "px";
        }

        size();
        window.onresize = function () {
            size();
            that.resizeCanvas("size");
            // that.resizeCanvas("left");
            // that.resizeCanvas("top");
        };


        var mousePx = 0;
        var mousePy = 0;
        var posLeft = this.mapGrid.style.left || "0px";
        var posTop  = this.mapGrid.style.top || "0px";

        if (!this.mapGrid.style.left) this.mapGrid.style.left = posLeft;
        if (!this.mapGrid.style.top) this.mapGrid.style.top = posTop;


        var act   = false;
        var actX  = false;
        var actY  = false;
        var moveX = 0;
        var moveY = 0;


        function formatSeconds(value) {
            var theTime  = parseInt(value);// 秒
            var theTime1 = 0;// 分
            var theTime2 = 0;// 小时
            // alert(theTime);
            if (theTime > 60) {
                theTime1 = parseInt(theTime / 60);
                theTime  = parseInt(theTime % 60);

                // alert(theTime1+"-"+theTime);
                // if(theTime1 > 60) {
                //     theTime2 = parseInt(theTime1/60);
                //     theTime1 = parseInt(theTime1%60);
                // }
            }
            var result = "" + parseInt(theTime);
            if (theTime < 10) result = "0" + theTime;
            if (theTime1 > 0) {
                result = "" + (theTime1 < 10 ? "0" + parseInt(theTime1) : parseInt(theTime1)) + ":" + result;
            }
            return result;
        }

        this.dist      = 0;
        this.paintLine = function (isMove) {
            // Draw measure points
            var canvas    = that.canvasContextCache["main"];
            // console.log(canvas);
            var prevPoint = [0, 0];
            for (var i = 0; i < that.measurePoints.length; i++) {
                canvas.beginPath();
                canvas.moveTo(that.measurePoints[i][0], that.measurePoints[i][1]);
                canvas.lineTo(i == 0 ? that.measurePoints[i][0] : prevPoint[0], i == 0 ? that.measurePoints[i][1] : prevPoint[1]);
                canvas.lineWidth   = 3;
                // canvas.setLineDash([20, 20]);
                canvas.strokeStyle = '#fff';
                canvas.stroke();
                canvas.closePath();

                // Calculate pxcels
                this.dist += (i == 0 || isMove) ? 0 : (Math.sqrt(Math.pow(that.measurePoints[i][0] - prevPoint[0], 2) + Math.pow(that.measurePoints[i][1] - prevPoint[1], 2)))

                prevPoint[0] = that.measurePoints[i][0];
                prevPoint[1] = that.measurePoints[i][1];
            }

            if (that.measurePoints.length > 1) {

                // Calculate meter
                var meter = Math.round(that.dist / (that.lt * that.currentMaxBlocks()) * that.distx);

                that.drawTip(
                    that.measurePoints[that.measurePoints.length - 1][0],
                    that.measurePoints[that.measurePoints.length - 1][1],
                    meter,
                    formatSeconds(meter / that.data.run_speed_min),
                    formatSeconds(meter / that.data.run_speed_max),
                    formatSeconds(meter / that.data.drive_speed)
                )

            }
        }
        this.mapGrid.addEventListener("mousedown", function (evt) {


            // measure mode
            if (that.measure_mode) {

                that.resizeCanvas("repaint", null, function () {
                    that.measurePoints.push([evt.clientX, evt.clientY]);
                    that.dist = 0;
                    that.paintLine();
                })
                return;
            }
            act     = true;
            mousePx = evt.clientX
            mousePy = evt.clientY
            posLeft = that.mapGrid.style.left || "0px";
            posTop  = that.mapGrid.style.top || "0px";
        })

        this.mapGrid.addEventListener("mousemove", function (evt) {

            if (that.measure_mode) {

                that.resizeCanvas("repaint", null, function () {

                    that.paintLine(true);
                    var canvas = that.canvasContextCache["main"];
                    if (that.measurePoints.length > 0) {
                        canvas.beginPath();
                        canvas.strokeStyle = '#fff';
                        canvas.stroke();
                        canvas.moveTo(evt.clientX, evt.clientY);
                        canvas.lineTo(that.measurePoints[that.measurePoints.length - 1][0], that.measurePoints[that.measurePoints.length - 1][1]);
                        canvas.closePath();
                        canvas.stroke();


                        var tempDist = parseInt(that.dist) + (Math.sqrt(Math.pow(that.measurePoints[that.measurePoints.length - 1][0] - evt.clientX, 2) + Math.pow(that.measurePoints[that.measurePoints.length - 1][1] - evt.clientY, 2)))
                        var meter    = Math.round(tempDist / (that.lt * that.currentMaxBlocks()) * that.distx);

                        that.drawTip(
                            evt.clientX,
                            evt.clientY,
                            meter,
                            formatSeconds(meter / that.data.run_speed_min),
                            formatSeconds(meter / that.data.run_speed_max),
                            formatSeconds(meter / that.data.drive_speed)
                        )

                    }

                })

                evt.target.style.cursor = "crosshair";
            } else {
                if (getComputedStyle(evt.target).cursor !== "auto") evt.target.style.cursor = "auto";
            }
            if (!act) return;
            moveX = evt.clientX;
            moveY = evt.clientY;


            if (parseInt(posLeft) + evt.clientX - mousePx >= 0 || document.documentElement.clientWidth >= that.currentMaxBlocks() * that.lt) {
                actX                    = false;
                that.mapGrid.style.left = "0px";
                posLeft                 = "0px";
                // 重置X轴定位点
                mousePx                 = evt.clientX
            } else {
                actX = true;
                if (parseInt(posLeft) + evt.clientX - mousePx <= document.documentElement.clientWidth - that.currentMaxBlocks() * that.lt) {

                    actY                    = false;
                    that.mapGrid.style.left = document.documentElement.clientWidth - that.currentMaxBlocks() * that.lt + "px";
                    posLeft                 = document.documentElement.clientWidth - that.currentMaxBlocks() * that.lt + "px";

                    // 重置Y轴定位点
                    mousePx = evt.clientX
                }
            }


            if (parseInt(posTop) + evt.clientY - mousePy >= 0 || document.documentElement.clientHeight >= that.currentMaxBlocks() * that.lt) {
                actY                   = false;
                that.mapGrid.style.top = "0px";
                posTop                 = "0px";
                // 重置Y轴定位点
                mousePy                = evt.clientY
            } else {
                actY = true;
                if (parseInt(posTop) + evt.clientY - mousePy <= document.documentElement.clientHeight - that.currentMaxBlocks() * that.lt) {
                    actY                   = false;
                    that.mapGrid.style.top = document.documentElement.clientHeight - that.currentMaxBlocks() * that.lt + "px";
                    posTop                 = document.documentElement.clientHeight - that.currentMaxBlocks() * that.lt + "px";
                    // 重置Y轴定位点
                    mousePy                = evt.clientY
                }
            }


            if (actX) {
                that.mapGrid.style.left = parseInt(posLeft) + evt.clientX - mousePx + "px";
            }
            if (actY) {
                that.mapGrid.style.top = parseInt(posTop) + evt.clientY - mousePy + "px";
                // console.log(that.mapGrid.style.top);
            }

            that.resizeCanvas("repaint")
            // that.resizeCanvas("left")
            // that.resizeCanvas("top")
            // this.mapGrid.style.left =
        })

        var endClick = function (evt) {
            posLeft = that.mapGrid.style.left;
            posTop  = that.mapGrid.style.top;
            act     = false;
        }
        this.mapGrid.addEventListener("mouseup", endClick);

        this.mapGrid.addEventListener("mouseout", endClick);

        this.mapGrid.addEventListener("wheel", function (evt) {

            that.centerXRatio = (evt.offsetX - evt.currentTarget.offsetLeft) / that.currentMaxBlocks() / that.lt
            that.centerYRatio = (evt.offsetY - evt.currentTarget.offsetTop) / that.currentMaxBlocks() / that.lt

            that.centerXoffset = evt.offsetX;
            that.centerYoffset = evt.offsetY;

            if (evt.deltaY < 0) {
                if (that.currentWeight >= that.maxWeight) return;
                that.currentWeight++;
            } else {
                if (that.currentWeight <= that.minWeight) return;
                that.currentWeight--;
            }

            that.resetGrid();
            that.renderAll();
            // TODO Performace Issue
            that.resizeCanvas("repaint")
            that.measure_mode  = false;
            that.measurePoints = [];
            // that.resizeCanvas("left")
            // that.resizeCanvas("top")
        })


        // Creat control bar

        var pbc = document.createElement("div");
        pbc.setAttribute("style", "width: 416px;height: 40px;background: #000;position: absolute; top:10%;left: 50%; margin-left: -210px; z-index: 11;border: 2px solid #fff;");
        pbc.className = "pubg-control";
        that.mapContainer.appendChild(pbc);

        this.data.layers.forEach(function (value) {


            var child          = document.createElement("div");
            child.style.width  = "52px"
            child.style.height = "40px"
            child.style.float  = "left"
            child.style.cursor = "pointer";
            child.className    = "ctrl";
            child.setAttribute("title", value.desc);
            child.setAttribute("active", "true");
            child.setAttribute("icon_normal", value.icon_normal);
            child.setAttribute("icon_active", value.icon_active);
            child.setAttribute("type", value.id);
            child.style.backgroundImage = "url(" + value.icon_active + ")"


            var changeIconStyle = function (iconDomElement, mode) {


                function icon_active() {
                    iconDomElement.setAttribute("active", "true");
                    iconDomElement.style.backgroundImage = "url(" + iconDomElement.getAttribute("icon_active") + ")";
                    return true;
                }

                function icon_normal() {
                    iconDomElement.setAttribute("active", "false");
                    iconDomElement.style.backgroundImage = "url(" + iconDomElement.getAttribute("icon_normal") + ")";
                    return false;
                }

                if (mode === "true") {
                    // Active current layer
                    return icon_active();
                }

                if (mode === "false") {
                    // Deactive current layer
                    return icon_normal();
                }

                if (iconDomElement.getAttribute("active") === "true") {
                    return icon_normal();
                }

                if (iconDomElement.getAttribute("active") === "false") {
                    return icon_active();
                }
            }
            child.addEventListener("click", function (evt) {
                if ("measure_mode" === evt.target.getAttribute("type")) {

                    that.measure_mode  = !that.measure_mode;
                    that.measurePoints = [];
                    // return;
                }


                if ("all" === evt.target.getAttribute("type")) {

                    var stat = evt.target.getAttribute("active") === "true" ? "false" : "true"

                    document.querySelectorAll("div[active]").forEach(function (v) {
                        // console.log();
                        // console.log(v);
                        changeIconStyle(v, stat);
                    })
                } else {
                    changeIconStyle(evt.target);
                }
                that.renderAll();
            })
            document.querySelector(".pubg-control").appendChild(child);
        })


        // Licence
        // var licence = document.createElement("div");
        // licence.style.zIndex = "100";
    }

    pubgMap.prototype.colorRgb         = function (color) {
        var reg    = /^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/;
        var sColor = color.toLowerCase();
        if (sColor && reg.test(sColor)) {
            if (sColor.length === 4) {
                var sColorNew = "#";
                for (var i = 1; i < 4; i += 1) {
                    sColorNew += sColor.slice(i, i + 1).concat(sColor.slice(i, i + 1));
                }
                sColor = sColorNew;
            }
            var sColorChange = [];
            for (var i = 1; i < 7; i += 2) {
                sColorChange.push(parseInt("0x" + sColor.slice(i, i + 2)));
            }
            return sColorChange;
        } else {
            return sColor;
        }
    }
    pubgMap.prototype.currentMaxBlocks = function () {
        return Math.pow(2, this.currentWeight);
    }

    pubgMap.prototype.inArray = function (arr, value) {
        for (var i = 0; i < arr.length; i++) {
            if (value === arr[i]) {
                return true;
            }
        }
        return false;
    }


    pubgMap.prototype.resizeCanvas = function (direction, afterClear, afterRender) {
        var that = this;
        this.querySelectorAllForEach(".pubgm-map-canvas", function (value) {
            // console.log(1);
            // if (direction === "size") {
            //     value.width  = document.documentElement.clientWidth;
            //     value.height = document.documentElement.clientHeight;
            //     // Repaint
            //     value.parentNode.removeChild(value);
            //     that["draw_" + value.getAttribute("layer-type")]();
            //     value.style["left"] = -parseInt(that.mapGrid.style["left"]) + "px";
            //     value.style["top"] = -parseInt(that.mapGrid.style["top"]) + "px";
            //     console.log(value.style["left"]);
            // } else if (direction === "repaint") {
            // value.parentNode.removeChild(value);

            that.canvasContextCache["main"].clearRect(0, 0, document.documentElement.clientWidth, document.documentElement.clientHeight);
            // value.width  = 0;
            // value.height = 0;
            value.width  = document.documentElement.clientWidth;
            value.height = document.documentElement.clientHeight;


            afterClear && afterClear();
            that.renderAll();
            afterRender && afterRender();
            // that["draw_" + value.getAttribute("layer-type")]();
            // translate(20px,20px)
            value.style["transform"] = "translate3d(" + -parseInt(that.mapGrid.style["left"]) + "px, " + -parseInt(that.mapGrid.style["top"]) + "px, 0)"
            // value.style["left"] = -parseInt(that.mapGrid.style["left"]) + "px";
            // value.style["top"]  = -parseInt(that.mapGrid.style["top"]) + "px";
            // }
        })
    }


    pubgMap.prototype.querySelectorAllForEach = function (ele, callback) {
        return Array.prototype.forEach.call(document.querySelectorAll(ele), callback);
    }

    pubgMap.prototype.resetGrid       = function () {

        var that = this;
        if (!this.inArray(this.weightCache, this.currentWeight)) {
            this.insertMapGridWrap();
        }

        this.querySelectorAllForEach(".pubgm-map-grid-wrap", function (i, t) {
            parseInt(i.attributes["weight"].value) == that.currentWeight ? i.style.display = "block" : i.style.display = "none";
        })


        this.mapGrid.style.width  = this.currentMaxBlocks() * this.lt + 'px';
        this.mapGrid.style.height = this.currentMaxBlocks() * this.lt + 'px';

        var l = -this.currentMaxBlocks() * this.lt * this.centerXRatio + this.centerXoffset;
        var t = -this.currentMaxBlocks() * this.lt * this.centerYRatio + this.centerYoffset;
        l     = document.documentElement.clientWidth - this.currentMaxBlocks() * this.lt < l ? l : document.documentElement.clientWidth - this.currentMaxBlocks() * this.lt;
        t     = document.documentElement.clientHeight - this.currentMaxBlocks() * this.lt < t ? t : document.documentElement.clientHeight - this.currentMaxBlocks() * this.lt;

        if (l > 0) l = 0;
        if (t > 0) t = 0;
        this.mapGrid.style.left = l + "px";
        this.mapGrid.style.top  = t + "px";


        var currentWrap = this.getMapGridWrap(this.currentWeight);

        if (!this.inArray(this.weightCache, this.currentWeight)) {


            for (var i = 0; i < this.currentMaxBlocks(); i++) {

                for (var j = 0; j < this.currentMaxBlocks(); j++) {
                    var b                   = document.createElement('div');
                    b.style.backgroundImage = "url(" + this.urlBase + "/weight_" + this.currentWeight + "/" + j + "_" + i + ".png)";
                    b.className             = "grids";
                    currentWrap.appendChild(b);
                }
            }

            this.weightCache.push(this.currentWeight);
        }


        // Reset canvas

        this.querySelectorAllForEach(".pubgm-map-canvas", function (value) {
            value.parentNode.removeChild(value);
        })

        return this;
    }
    pubgMap.prototype.draw_text_label = function () {


        var canvas = "";
        if (!document.querySelector("canvas[layer-type=\"main\"]")) {
            canvas           = document.createElement("canvas");
            canvas.className = "pubgm-map-canvas";
            canvas.setAttribute("layer-type", "main");
            canvas.width  = document.documentElement.clientWidth;
            canvas.height = document.documentElement.clientHeight;
            this.mapGrid.appendChild(canvas);

            canvas                          = document.querySelector("canvas[layer-type=\"main\"]");
            this.canvasContextCache["main"] = canvas.getContext('2d');
        }

        var mapCanvasContext = this.canvasContextCache["main"];


        // mapCanvas.width  = this.lt * this.currentMaxBlocks();
        // mapCanvas.height = this.lt * this.currentMaxBlocks();

        mapCanvasContext.font        = this.markerStyle.font;
        mapCanvasContext.fillStyle   = this.markerStyle.fillStyle;
        mapCanvasContext.textAlign   = this.markerStyle.textAlign;
        mapCanvasContext.lineWidth   = this.markerStyle.lineWidth;
        mapCanvasContext.strokeStyle = this.markerStyle.strokeStyle;

        for (var i = 0; i < this.data.locations.length; i++) {
            var label = this.data.locations[i].label;
            var x     = this.data.locations[i].x * this.lt * this.currentMaxBlocks() / this.distx * this.fixRatio + parseInt(this.mapGrid.style.left);
            var y     = this.data.locations[i].y * this.lt * this.currentMaxBlocks() / this.disty * this.fixRatio + parseInt(this.mapGrid.style.top);
            mapCanvasContext.strokeText(label, x, y);
            mapCanvasContext.fillText(label, x, y);
        }
        mapCanvasContext.textAlign = "left";
        mapCanvasContext.fillText("PLAYERUNKNOWN'S BATTLEGROUNDS MAP TOOL v1.0.0", 15, 40);
        mapCanvasContext.fillText("By Aria", 15, 65);
        return this;
    }


    pubgMap.prototype.creatLootAreas = function (order) {


        return function () {


            var areas = this.data.layers[order];

            var mapCanvasContext = this.canvasContextCache["main"];
            for (var i = 0; i < areas.geojson.length; i++) {
                //                            console.log(this.mapGrid.style.left);
                var x      = areas.geojson[i].x * this.lt * this.currentMaxBlocks() / this.distx * this.fixRatio + parseInt(this.mapGrid.style.left);
                var y      = areas.geojson[i].y * this.lt * this.currentMaxBlocks() / this.disty * this.fixRatio + parseInt(this.mapGrid.style.top);
                var radius = areas.geojson[i].radius * this.lt * this.currentMaxBlocks() / this.distx;

                mapCanvasContext.beginPath();
                mapCanvasContext.arc(x, y, radius, 0, 2 * Math.PI);
                mapCanvasContext.lineWidth   = 2;
                mapCanvasContext.strokeStyle = areas.color;
                mapCanvasContext.stroke();

                mapCanvasContext.beginPath();
                mapCanvasContext.arc(x, y, radius, 0, 2 * Math.PI);
                var color                  = this.colorRgb(areas.color);
                mapCanvasContext.fillStyle = "rgba(" + color[0] + ", " + color[1] + ", " + color[2] + ", 0.25)";
                mapCanvasContext.fill();
                mapCanvasContext.closePath();
            }

            return this;
        }
    }


    pubgMap.prototype.creatPoints = function (order) {

        return function () {


            var mapCanvasContext = this.canvasContextCache["main"];
            var areas            = this.data.layers[order];
            var that             = this;

            function drawIcon() {

                for (var i = 0; i < areas.geojson.length; i++) {

                    var x = areas.geojson[i].x * that.lt * that.currentMaxBlocks() / that.distx * that.fixRatio + parseInt(that.mapGrid.style.left);
                    var y = areas.geojson[i].y * that.lt * that.currentMaxBlocks() / that.disty * that.fixRatio + parseInt(that.mapGrid.style.top);

                    mapCanvasContext.drawImage(this, x - 0.5 * this.width, y - this.height);
                }

                if (!that.imageCache[areas.id]) that.imageCache[areas.id] = this;

            }

            if (this.imageCache[areas.id]) {
                drawIcon.call(this.imageCache[areas.id]);
            } else {
                var imgObj    = new Image();
                imgObj.src    = areas.icon;
                imgObj.onload = drawIcon;
            }


            return this;
        }
    }


    pubgMap.prototype.drawTip = function (ponitX, pointY, meter, onFootTimeMin, onFootTimeMax, vehicleTime) {
        var canvas = this.canvasContextCache["main"];
        canvas.beginPath();
        canvas.rect(ponitX + 5, pointY - 105, 200, 95);
        canvas.lineWidth   = 2;
        canvas.strokeStyle = "#000";
        canvas.fillStyle   = "#fff";
        canvas.fill();
        canvas.stroke();

        canvas.font      = "22px Microsoft Yahei"
        canvas.fillStyle = "red";
        canvas.lineWidth = 0;
        canvas.textAlign = "left";
        canvas.fillText(meter + "米", ponitX + 15, pointY - 75);

        canvas.fillStyle = "#666";
        canvas.font      = "16px Microsoft Yahei"
        canvas.fillText("徒步耗时：" + onFootTimeMin + "-" + onFootTimeMax, ponitX + 15, pointY - 45);
        canvas.fillText("载具耗时：" + vehicleTime, ponitX + 15, pointY - 25);

        canvas.closePath();
    }

    pubgMap.prototype.draw_high_loot_areas      = pubgMap.prototype.creatLootAreas(1);
    pubgMap.prototype.draw_mid_loot_areas       = pubgMap.prototype.creatLootAreas(2);
    // 固定车点
    pubgMap.prototype.draw_high_car_spawns      = pubgMap.prototype.creatPoints(3);
    // 随机车点
    pubgMap.prototype.draw_possible_car_spawns  = pubgMap.prototype.creatPoints(4);
    // 随机船点
    pubgMap.prototype.draw_possible_boat_spawns = pubgMap.prototype.creatPoints(5);
    // 高级枪械
    pubgMap.prototype.draw_high_gun_loot        = pubgMap.prototype.creatPoints(6);

    pubgMap.prototype.renderAll = function () {

        this.canvasContextCache["main"] && this.canvasContextCache["main"].clearRect(0, 0, document.documentElement.clientWidth, document.documentElement.clientHeight);
        this.draw_text_label();
        var that = this;
        this.querySelectorAllForEach("div[active=\"true\"]", function (value) {
            // console.log();
            that["draw_" + value.getAttribute("type")] && that["draw_" + value.getAttribute("type")]();

            // that.paintLine();
        })

        // return this.draw_high_loot_areas().draw_mid_loot_areas()
        // return this.draw_text_label();
    }
})();

// new instance
if (/Android|webOS|iPhone|iPod|BlackBerry/i.test(navigator.userAgent)) {
    alert("移动端请使用官方APP内置地图功能谢谢");
} else if (!/Chrome|Firefox/i.test(navigator.userAgent)) {
    alert("对不起，浏览器不受支持");
} else {
    var pm = new pubgMap("#pubg-map-container", data);
    pm.resetGrid().renderAll();
}