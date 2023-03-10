import Decimal from "decimal.js";
// const d3 = require('d3');
// const tubeMap = require('d3-tube-map');
// d3.tubeMap = tubeMap.tubeMap;

export default function (qlik, jtopo) {
  const {
    Stage,
    Layer,
    CircleNode, TextNode, Node, PolygonNode,
    Link,
  } = jtopo;
  return function ($element, layout) {
    $("#container").empty();
    //we havent got all the rows yet, so get some more, 1000 rows
    let requestPage = [{
      qTop: 0,
      qLeft: 0,
      qWidth: 10, //should be # of columns
      qHeight: 1000
    }];
    this.backendApi.getData( requestPage ).then( function ( dataPages ) {
      //when we get the result trigger paint again
      const width = $("#container").width();
      const height = $("#container").height();

      // 交叉站点
      const crossStations = new Set();
      const distance = 15;

      let stage = new Stage("container");
      let layer = new Layer();
      stage.toolbar.hide();
      stage.addChild(layer);

      let data = dataPages[0].qMatrix.map((q) => {
        return {
          line: q[0].qText,
          stationId: q[1].qText,
          stationName: q[2].qText.replace(/\(.*?\)/g, ""),
          latitude: q[3].qText,
          longitude: q[4].qText,
          sort: q[5].qText,
        }
      }).sort((a, b) => Number(a.sort) - Number(b.sort));

      // 纬度->横坐标
      const { min: minLatitude, maxDiff: maxLatitudeDiff } = getMinMaxDiff(data.map(d => d.latitude));
      // 经度->纵坐标
      const { min: minLongitude, maxDiff: maxLongitudeDiff } = getMinMaxDiff(data.map(d => d.longitude));

      data = data.map(d => {
        return {
          ...d,
          latitude: Decimal(d.latitude).sub(minLatitude).toNumber(),
          longitude: Decimal(d.longitude).sub(minLongitude).toNumber(),
        }
      })

      // all stations
      // all labels
      const stations = [];
      const labels = [];
      const stationsSet = new Set();
      data.forEach((d) => {
        if (!stationsSet.has(d.stationId)) {
          let x = Decimal(width).div(maxLatitudeDiff).mul(Decimal(d.latitude)).mul(Decimal(8));
          let y = Decimal(height).div(maxLongitudeDiff).mul(Decimal(d.longitude)).mul(Decimal(8));

          // // let x = 0, y = 0;
          // if (stations.length > 0) {
          //   const preStation = stations[stations.length - 1];
          //   // 如果对角线小于distance，那么长和宽按比例变化
          //   const preNodeX = Decimal(preStation.x);
          //   const preNodeY = Decimal(preStation.y);
          //   const xDiff = preNodeX.sub(x);
          //   const yDiff = preNodeY.sub(y);
          //   const straightLineDistance = Decimal.sqrt(Decimal.pow(Decimal.abs(xDiff), 2).add(Decimal.pow(Decimal.abs(yDiff), 2)));
          //   // const scale = Decimal(distance).div(straightLineDistance);
          //   // if (xDiff.toNumber() < 0) {
          //   //   x = x.add(scale.sub(Decimal(1)).mul(Decimal.abs(xDiff)));
          //   // } else if (xDiff.toNumber > 0) {
          //   //   x = x.sub(scale.sub(Decimal(1)).mul(Decimal.abs(xDiff)));
          //   // }
          //   // if (yDiff.toNumber() < 0) {
          //   //   y = y.add(scale.sub(Decimal(1)).mul(Decimal.abs(yDiff)));
          //   // } else if (xDiff.toNumber > 0) {
          //   //   y = y.sub(scale.sub(Decimal(1)).mul(Decimal.abs(yDiff)));
          //   // }
          // }

          x = x.toNumber();
          y = y.toNumber();
          const station = {
            id: d.stationId,
            name: d.stationName,
            x: x,
            y: y,
            userData: {
              latitude: d.latitude,
              longitude: d.longitude,
            }
          }
          const label = {
            text: d.stationName,
            x: x + 15,
            y: y + 15,
          }
          stations.push(station);
          labels.push(label);
          stationsSet.add(d.stationId);
        } else {
          crossStations.add(d.stationId);
        }
      });
      // all lines
      const lines = [];
      const lineSet = new Set();
      data.forEach((d) => {
        if (!lineSet.has(d.line)) {
          const line = {
            name: d.line,
            color: jtopo.randomColor(),
            stations: data.filter(dc => dc.line === d.line).map(dc => dc.stationId),
          };
          
          lines.push(line);
          lineSet.add(d.line);
        }
      });

      function draw() {
        const stationMap = {};
        const childs = [];
        // 站点标签
        // labels.forEach(function (label) {
        //   let node = new TextNode(label.text, label.x, label.y);
        //   node.mouseEnabled = false;
        //   childs.push(node);
        // });
    
        //  圆形站点
        stations.forEach(function (station) {
          let node = new CircleNode(station.name, station.x, station.y, 50);
          node.draggable = false;
          node.mouseEnabled = false;
          node.textOffsetX = 50;
          node.textOffsetY = 10;
          node.userData = {
            stationId: station.id,
          }
          node.css({
            background: 'white',
            borderWidth: 2,
            borderColor: 'grey',
            font: 'bold 20px arial',
          });
          stationMap[station.id] = node;
          childs.push(node);
        });
    
        // 线路
        lines.forEach(drawLine);
        layer.addChilds(childs);

        stage.show();
        // stage.showOverview();
        stage.zoomFullStage();
        
        function drawLine(line) {
          let preNode = null;
          line.stations.forEach(function (idOrObj, index) {
            let id = idOrObj.id ? idOrObj.id : idOrObj;
            // 交叉站点
            if (crossStations.has(id)) {
              const startOrEndStation = childs.find(sc => sc.userData && sc.userData.stationId === id);
              // startOrEndStation.setRadius(20);
              startOrEndStation.css({
                borderWidth: 10,
              })
            }
            // 起始站和结束站
            if (index === 0 || index === (line.stations.length - 1)) {
              const startOrEndStation = childs.find(sc => sc.userData && sc.userData.stationId === id);
              // startOrEndStation.setRadius(20);
              startOrEndStation.css({
                background: line.color,
                borderWidth: 2,
                borderColor: 'white'
              })
            }
    
            let nextNode = stationMap[id];
            if (preNode == null) {
              preNode = nextNode;
              return;
            }
    
            let link = new Link(null, preNode, nextNode);
            
            link.mouseEnabled = false;
            link.showSelected = false;
            link.css({
              borderWidth: 30,
              borderColor: line.color,
            });

            childs.push(link);
            preNode = nextNode;
          });
        }
      }
      draw();
    });
  };
}

function getMinMaxDiff(arr) {
  let min = Decimal(arr[0]);
  let max = Decimal(arr[1]);
  let maxDiff = max.sub(min);
  let minDiff = Decimal(Infinity);

  for (let i = 2; i < arr.length; i++) {
    if (Decimal(arr[i]).comparedTo(min) === -1) {
      min = Decimal(arr[i]);
    } else if (Decimal(arr[i]).comparedTo(max) === 1) {
      max = Decimal(arr[i]);
    }

    let currentDiff = max.sub(min);
    if (Decimal(currentDiff).comparedTo(maxDiff) === 1) {
      maxDiff = currentDiff;
    }
    if (Decimal(currentDiff).comparedTo(minDiff) === -1) {
      minDiff = currentDiff;
    }
  }

  return { max, min, maxDiff, minDiff };
}
