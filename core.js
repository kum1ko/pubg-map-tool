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

        this.fixRatio      = 0.9778;
        this.distx         = 8000;
        this.disty         = 8000;
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
        this.mapGrid.addEventListener("mousedown", function (evt) {
            act     = true;
            mousePx = evt.clientX
            mousePy = evt.clientY
            posLeft = that.mapGrid.style.left || "0px";
            posTop  = that.mapGrid.style.top || "0px";
        })

        this.mapGrid.addEventListener("mousemove", function (evt) {

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
            }

            that.resizeCanvas("repaint")
            // that.resizeCanvas("left")
            // that.resizeCanvas("top")
            // this.mapGrid.style.left =
        })

        this.mapGrid.addEventListener("mouseup", function (evt) {
            posLeft = that.mapGrid.style.left;
            posTop  = that.mapGrid.style.top;
            act     = false;
        })


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
            that.resizeCanvas("repaint")
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
            child.addEventListener("click", function (evt) {
                if ("measure_mode" === evt.target.getAttribute("type")) {

                    alert("即将上线");
                    return;
                }

                var findCanvas = document.querySelector("canvas[layer-type=\"" + value.id + "\"]");
                if (evt.target.getAttribute("active") === "false") {
                    // Active current layer

                    that["draw_" + value.id] && that["draw_" + value.id]();

                    that.resizeCanvas("repaint")
                    evt.target.setAttribute("active", "true");
                    evt.target.style.backgroundImage = "url(" + evt.target.getAttribute("icon_active") + ")";
                } else {
                    // Deactive current layer

                    if (findCanvas) {
                        findCanvas.parentNode.removeChild(findCanvas);
                    }
                    evt.target.setAttribute("active", "false");
                    evt.target.style.backgroundImage = "url(" + evt.target.getAttribute("icon_normal") + ")";
                }
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


    pubgMap.prototype.resizeCanvas = function (direction) {
        var that = this;
        document.querySelectorAll(".pubgm-map-canvas").forEach(function (value) {
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
            value.width  = 0;
            value.height = 0;
            value.width  = document.documentElement.clientWidth;
            value.height = document.documentElement.clientHeight;

            that["draw_" + value.getAttribute("layer-type")]();
            value.style["left"] = -parseInt(that.mapGrid.style["left"]) + "px";
            value.style["top"]  = -parseInt(that.mapGrid.style["top"]) + "px";
            // }
        })
    }

    pubgMap.prototype.resetGrid       = function () {

        var that = this;
        if (!this.inArray(this.weightCache, this.currentWeight)) {
            this.insertMapGridWrap();
        }
        document.querySelectorAll(".pubgm-map-grid-wrap").forEach(function (i, t) {
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

        document.querySelectorAll(".pubgm-map-canvas").forEach(function (value) {
            value.parentNode.removeChild(value);
        })

        return this;
    }
    pubgMap.prototype.draw_text_label = function () {


        var canvas = "";
        if (!document.querySelector("canvas[layer-type=\"text_label\"]")) {
            canvas           = document.createElement("canvas");
            canvas.className = "pubgm-map-canvas";
            canvas.setAttribute("layer-type", "text_label");
            canvas.width  = document.documentElement.clientWidth;
            canvas.height = document.documentElement.clientHeight;
            this.mapGrid.appendChild(canvas);

            canvas                                = document.querySelector("canvas[layer-type=\"text_label\"]");
            this.canvasContextCache["text_label"] = canvas.getContext('2d');
        }

        var mapCanvasContext = this.canvasContextCache["text_label"];


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

            var canvas = "";
            if (!document.querySelector("canvas[layer-type=\"" + areas.id + "\"]")) {
                canvas           = document.createElement("canvas");
                canvas.className = "pubgm-map-canvas";
                canvas.setAttribute("layer-type", areas.id);
                canvas.width  = document.documentElement.clientWidth;
                canvas.height = document.documentElement.clientHeight;
                this.mapGrid.appendChild(canvas);
                canvas                            = document.querySelector("canvas[layer-type=\"" + areas.id + "\"]");
                this.canvasContextCache[areas.id] = canvas.getContext('2d');
            }


            var mapCanvasContext = this.canvasContextCache[areas.id];

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
            }

            return this;
        }
    }


    pubgMap.prototype.creatPoints = function (order) {

        return function () {

            var areas = this.data.layers[order];

            var canvas = "";
            if (!document.querySelector("canvas[layer-type=\"" + areas.id + "\"]")) {
                canvas           = document.createElement("canvas");
                canvas.className = "pubgm-map-canvas";
                canvas.setAttribute("layer-type", areas.id);
                canvas.width  = document.documentElement.clientWidth;
                canvas.height = document.documentElement.clientHeight;
                this.mapGrid.appendChild(canvas);
                canvas                            = document.querySelector("canvas[layer-type=\"" + areas.id + "\"]");
                this.canvasContextCache[areas.id] = canvas.getContext('2d');
            }

            var that             = this;
            var mapCanvasContext = this.canvasContextCache[areas.id];

            var areas = this.data.layers[order];


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
        this.draw_text_label();
        var that = this;
        document.querySelectorAll("div[active=\"true\"]").forEach(function (value) {
            // console.log();
            that["draw_" + value.getAttribute("type")] && that["draw_" + value.getAttribute("type")]();
        })
        // return this.draw_high_loot_areas().draw_mid_loot_areas()
        // return this.draw_text_label();
    }
})();

// new instance
if (/Android|webOS|iPhone|iPod|BlackBerry/i.test(navigator.userAgent)) {
    alert("移动端请使用官方APP内置地图功能谢谢");

} else {
    var pm = new pubgMap("#pubg-map-container", data);
    pm.resetGrid().renderAll();
}