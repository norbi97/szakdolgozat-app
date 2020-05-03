/* 
// Entityk huzogatasahoz szukseges funkciok
// https://www.w3schools.com/howto/howto_js_draggable.asp alapjan!
*/

var currentView = 0; /* 0: erd, 1: modell, 2: szöveges*/
var g_id = 0;
var g_entities = [];
var g_attributes = [];
var g_actions = [];

var svgWidth = 5000;
var svgHeight = 5000;

/* Return a kovetkezo 2 funkciora
egy lista: [object, type=[0,1,2] -> 0=entity, 1=attributum, 2=kapcsolat]
*/
function getObjectFromID(elementID) {
  var currentEntity = g_entities.find(x => x.id == elementID);
  var currentAttribute = g_attributes.find(x => x.id == elementID);
  var currentAction = g_actions.find(x => x.id == elementID);

  return ((currentEntity && [currentEntity, 0]) || (currentAttribute && [currentAttribute, 1]) || (currentAction && [currentAction, 2]) || [null, null]);
}

function getObjectFromElement(elmnt) {
  if (!elmnt.id) {
    elmnt = elmnt.parentNode;
  }
  var elementID = elmnt.id.split("_")[2];
  return getObjectFromID(elementID);
}

function deleteEntity(egyed, childrenToo = false) { // Actionokre is ervenyes!
  var toDelete = [];
  var oldRelationsfrom = [];
  var oldRelationsto = [];
  if (egyed) {
    egyed.children.forEach(child => {
      toDelete.push(child);
    });

    toDelete.forEach(child => {
      setNewParentOfAttribute(child, null);
      if (childrenToo) {
        deleteAttribute(child);
      }
    });

    if (egyed.constructor.name == "Action") {
      setActionRelation(egyed, "from", null);
      setActionRelation(egyed, "to", null);
    }

    if (egyed.constructor.name == "Entity") {
      oldRelationsfrom = oldRelationsfrom.concat(egyed.relationsFrom);
      oldRelationsto = oldRelationsto.concat(egyed.relationsTo);
    }

    oldRelationsfrom.forEach(element => {
      setActionRelation(element, "to", null, null)
    });

    oldRelationsto.forEach(element => {
      setActionRelation(element, "from", null, null)
    });


    egyed.element.remove();

    const index = g_entities.indexOf(egyed);
    if (index > -1) {
      g_entities.splice(index, 1);
    }

    const index_a = g_actions.indexOf(egyed);
    if (index_a > -1) {
      g_actions.splice(index_a, 1);
    }

    delete egyed;
  }
}

function deleteAttribute(attr) {
  if (attr) {
    setNewParentOfAttribute(attr, null);

    attr.element.remove();

    const index = g_attributes.indexOf(attr);
    if (index > -1) {
      g_attributes.splice(index, 1);
    }

    delete attr;
  }
}

function setNewParentOfAttribute(elem, newparent) {
  var oldParent = elem.parent;
  elem.setParent(newparent);
  if (oldParent) {
    redrawLines(oldParent);
  }

  if (elem.parent) {
    redrawLines(elem.parent);
  }

  /*if (currentView == 1) {
    if (oldParent) {
      elem.element.remove();
    }

    if (elem.parent) {
      var divString;
      if (elem.parent.constructor.name == "Entity") {
        divString = `<p id="attribute_p_${elem.id}_" class="rm_attr"><span class="rs-anchor left"></span>${elem.name}<span class="rs-anchor right"></span></p>`
        $(elem.parent.element).find(".entity-content").append(divString);
      } else {
        divString = `<p id="attribute_p_${elem.id}_" class="rm_attr">${elem.name}</p>`;
        $(elem.parent.element).find(".relation-content").append(divString);
      }
      elem.element = $(`#attribute_p_${elem.id}_`);
    }
  }*/
  makeMainElementsDraggable();
  checkWeakEntities();
}

function setActionRelation(action, side, entity, attribute = null) {
  oldEntityFrom = action.relateFrom;
  oldEntityTo = action.relateTo;

  if (side == "from") {
    action.setRelateFrom(entity, attribute);
  } else {
    action.setRelateTo(entity, attribute);
  }

  if (action.relateFrom) {
    divString += `<p>[${action.relateFrom.name}] ${action.relateFromAttribute ? action.relateFromAttribute.name : "-"}</p>`;
  }

  if (action.relateTo) {
    divString += `<p>[${action.relateTo.name}] ${action.relateToAttribute ? action.relateToAttribute.name : "-"}</p>`;
  }

  if (action.relateFrom) {
    $(action.element).find(".cardinality").html(action.getCardinalityText("from"));
    $(action.element).find(".relation-nomodif .from").html(`[${action.relateFrom.name}] ${action.relateFromAttribute ? action.relateFromAttribute.name : "-"}`);
  } else {
    $(action.element).find(".cardinality").html("");
  }

  if (action.relateTo) {
    $(action.element).find(".card-to").html(action.getCardinalityText("to"));
    $(action.element).find(".relation-nomodif .to").html(`[${action.relateTo.name}] ${action.relateToAttribute ? action.relateToAttribute.name : "-"}`);
  } else {
    $(action.element).find(".card-to").html("");
  }

  if (oldEntityFrom) {
    redrawLines(oldEntityFrom);
  }

  if (oldEntityTo) {
    redrawLines(oldEntityTo);
  }

  redrawLines(entity);
  redrawLines(action);
}

/* Mozgatas */

var firstPosChange;
var diffx = [];
var diffy = [];
function moveElement(currentObject, objectType, newx, newy, elmnt, recursive = false) {
  var szelesseg = parseInt(currentObject.element.css("width"), 10);
  if (objectType == 0) { // entityk mozgatasa eseten a vonalak is mozogjanak
    if (currentView == 0) {
      currentObject.connectedLines.forEach(svg => {
        svg.children[0].x1.baseVal.value = newx + 60;
        svg.children[0].y1.baseVal.value = newy + 25;
      });
    } else {
      var currit = 0;
      currentObject.connectedLines.forEach(svg => {
        if (svg.children[0].x2.baseVal.value < (newx + szelesseg / 2)) {
          svg.children[0].x1.baseVal.value = currentObject.rx - 10;
          svg.children[0].y1.baseVal.value = currentObject.ry + 20 + 5* currit;
        } else {
          svg.children[0].x1.baseVal.value = currentObject.rx + szelesseg + 10;
          svg.children[0].y1.baseVal.value = currentObject.ry + 20 + 5* currit;
        }
        currit += 1;
      });

      if (!recursive) {
        currentObject.relationsFrom.forEach(rel => {
          if (rel.element) {
            moveElement(rel, getObjectFromElement(rel.element[0])[1], rel.rx, rel.ry, rel.element, true)
          }
        });

        currentObject.relationsTo.forEach(rel => {
          if (rel.element) {
            moveElement(rel, getObjectFromElement(rel.element[0])[1], rel.rx, rel.ry, rel.element, true)
          }
        });
      }
    }
  } else if (objectType == 1) {
    currentObject.connectedLines.forEach(svg => {
      svg.children[0].x2.baseVal.value = newx + 70;
      svg.children[0].y2.baseVal.value = newy + 35;
    });
  } else if (objectType == 2) {
    if (currentView == 0) {
      if (currentObject.relateFromLine) {
        currentObject.relateFromLine.children[0].x2.baseVal.value = newx - 40;
        currentObject.relateFromLine.children[0].y2.baseVal.value = newy + 50;

        currentObject.relateFromLine.children[1].x1.baseVal.value = newx - 20;
        currentObject.relateFromLine.children[1].y1.baseVal.value = newy + 50;
        currentObject.relateFromLine.children[1].x2.baseVal.value = newx - 40;
        currentObject.relateFromLine.children[1].y2.baseVal.value = newy + 50;
      }
      if (currentObject.relateToLine) {
        currentObject.relateToLine.children[0].x2.baseVal.value = newx + 140;
        currentObject.relateToLine.children[0].y2.baseVal.value = newy + 50;

        currentObject.relateToLine.children[1].x1.baseVal.value = newx + 120;
        currentObject.relateToLine.children[1].y1.baseVal.value = newy + 50;
        currentObject.relateToLine.children[1].x2.baseVal.value = newx + 140;
        currentObject.relateToLine.children[1].y2.baseVal.value = newy + 50;
      }
      currentObject.connectedLines.forEach(svg => {
        svg.children[0].x1.baseVal.value = newx + 50;
        svg.children[0].y1.baseVal.value = newy - 20;
      });
    } else { // Entity RM nezet
      // TODO.
      // if (currentObject.children.length == 0) {
      //   currentObject.element.hide();
      // } else {
      //   currentObject.element.show();
      // }
      if (currentObject.relateFromLine) { // Ha van from, muszaj h legyen to is ebben a nezetben
        // Kivalasztjuk melyik oldalrol connecteljunk
        var fromOffset = 8;
        var toOffset = 8;
        var fromOffset2 = 8;
        var toOffset2 = 8;

        // if (!currentObject.element.is(':visible')) {
        //   // TODO.
        // }

        if (currentObject.relateFromLine.children[0].x1.baseVal.value < (newx + szelesseg / 2)) {
          currentObject.relateFromLine.children[0].x2.baseVal.value = newx - 10;
          currentObject.relateFromLine.children[0].y2.baseVal.value = newy + 10;
          fromOffset *= -1;
        } else {
          currentObject.relateFromLine.children[0].x2.baseVal.value = newx + szelesseg + 10;
          currentObject.relateFromLine.children[0].y2.baseVal.value = newy + 10;
        }

        if (currentObject.relateToLine.children[0].x1.baseVal.value < (newx + szelesseg / 2)) {
          currentObject.relateToLine.children[0].x2.baseVal.value = newx - 10;
          currentObject.relateToLine.children[0].y2.baseVal.value = newy + 10;
          toOffset *= -1;
        } else {
          currentObject.relateToLine.children[0].x2.baseVal.value = newx + szelesseg + 10;
          currentObject.relateToLine.children[0].y2.baseVal.value = newy + 10;
        }

        // Kivalasztjuk, hogy a masik oldalt melyikhez connecteljuk
        var toszeles = parseInt(currentObject.relateTo.element.css("width"), 10);
        if (currentObject.relateTo.rx > currentObject.relateToLine.children[0].x2.baseVal.value - (toszeles / 2)) {
          currentObject.relateToLine.children[0].x1.baseVal.value = currentObject.relateTo.rx - 10;
          toOffset2 *= -1;
        } else {
          currentObject.relateToLine.children[0].x1.baseVal.value = currentObject.relateTo.rx + toszeles + 10;
        }

        var fromszeles = parseInt(currentObject.relateFrom.element.css("width"), 10);
        if (currentObject.relateFrom.rx > currentObject.relateFromLine.children[0].x2.baseVal.value - (fromszeles / 2)) {
          currentObject.relateFromLine.children[0].x1.baseVal.value = currentObject.relateFrom.rx - 10;
          fromOffset2 *= -1;
        } else {
          currentObject.relateFromLine.children[0].x1.baseVal.value = currentObject.relateFrom.rx + fromszeles + 10;
        }

        //Ha ugyan ott van a ketto kiindulopont, az egyiket picit lejjebb toljuk
        if (currentObject.relateToLine.children[0].x2.baseVal.value == currentObject.relateFromLine.children[0].x2.baseVal.value) {
          currentObject.relateToLine.children[0].y2.baseVal.value += (currentObject.relateToLine.children[0].y1.baseVal.value > currentObject.relateFromLine.children[0].y1.baseVal.value) ? 5 : -5;
        }

        currentObject.relateFromLine.children[1].x1.baseVal.value = currentObject.relateFromLine.children[0].x2.baseVal.value - fromOffset;
        currentObject.relateFromLine.children[1].y1.baseVal.value = currentObject.relateFromLine.children[0].y2.baseVal.value;
        currentObject.relateFromLine.children[1].x2.baseVal.value = currentObject.relateFromLine.children[0].x2.baseVal.value;
        currentObject.relateFromLine.children[1].y2.baseVal.value = currentObject.relateFromLine.children[0].y2.baseVal.value;

        currentObject.relateToLine.children[1].x1.baseVal.value = currentObject.relateToLine.children[0].x2.baseVal.value;
        currentObject.relateToLine.children[1].y1.baseVal.value = currentObject.relateToLine.children[0].y2.baseVal.value;
        currentObject.relateToLine.children[1].x2.baseVal.value = currentObject.relateToLine.children[0].x2.baseVal.value - toOffset;
        currentObject.relateToLine.children[1].y2.baseVal.value = currentObject.relateToLine.children[0].y2.baseVal.value;

        currentObject.relateFromLine.children[2].x1.baseVal.value = currentObject.relateFromLine.children[0].x1.baseVal.value - fromOffset2;
        currentObject.relateFromLine.children[2].y1.baseVal.value = currentObject.relateFromLine.children[0].y1.baseVal.value;
        currentObject.relateFromLine.children[2].x2.baseVal.value = currentObject.relateFromLine.children[0].x1.baseVal.value;
        currentObject.relateFromLine.children[2].y2.baseVal.value = currentObject.relateFromLine.children[0].y1.baseVal.value;

        currentObject.relateToLine.children[3].x1.baseVal.value = currentObject.relateToLine.children[0].x1.baseVal.value;
        currentObject.relateToLine.children[3].y1.baseVal.value = currentObject.relateToLine.children[0].y1.baseVal.value;
        currentObject.relateToLine.children[3].x2.baseVal.value = currentObject.relateToLine.children[0].x1.baseVal.value - toOffset2;
        currentObject.relateToLine.children[3].y2.baseVal.value = currentObject.relateToLine.children[0].y1.baseVal.value;

        if (!recursive) {
          moveElement(currentObject.relateFrom, getObjectFromElement(currentObject.relateFrom.element[0])[1], currentObject.relateFrom.rx, currentObject.relateFrom.ry, currentObject.relateFrom.element, true)
          moveElement(currentObject.relateTo, getObjectFromElement(currentObject.relateTo.element[0])[1], currentObject.relateTo.rx, currentObject.relateTo.ry, currentObject.relateTo.element, true)
        }
      }
    }
  }

  if (elmnt) {
    if (moveTogether[elmnt.id]) { // egyutt mozgassuk az attributumokkal
      if (firstPosChange) {
        currentObject.children.forEach(child => {
          diffx[child.id] = parseInt(child.element.css('left'), 10) - newx;
          diffy[child.id] = parseInt(child.element.css('top'), 10) - newy;
        });
        firstPosChange = false;
      }
      currentObject.children.forEach(child => {
        child.element.css('left', newx + diffx[child.id]);
        child.element.css('top', newy + diffy[child.id]);
        child.connectedLines[0].children[0].x2.baseVal.value = newx + diffx[child.id] + 60;
        child.connectedLines[0].children[0].y2.baseVal.value = newy + diffy[child.id] + 25;
      });
    }
  }
}

var moveTogether = [];
function makeElementDraggable(elmnt) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

  // ha van header/footer, akkor csak ott tudjuk megfogni az elemet, egyebkent barhol!
  if (document.getElementById(elmnt.id + "_header")) {
    document.getElementById(elmnt.id + "_header").onmousedown = dragMouseDown;
  } else {
    elmnt.onmousedown = dragMouseDown;
  }

  if (document.getElementById(elmnt.id + "_footer")) {
    document.getElementById(elmnt.id + "_footer").onmousedown = dragMouseDown;
  } else {
    elmnt.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    //if( e.target !== this) return;
    diffx = [];
    diffy = [];

    e = e || window.event;
    e.preventDefault();
    firstPosChange = true;
    pos3 = e.pageX;
    pos4 = e.pageY;
    document.onmouseup = closeDragElement; // felengedeskor ne mozgassuk
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    pos1 = pos3 - e.pageX;
    pos2 = pos4 - e.pageY;
    pos3 = e.pageX;
    pos4 = e.pageY;
    var newy = Math.min($("#editor").height() + 100, Math.max((elmnt.offsetTop - pos2), $("#panel-and-toolbar").height()));
    var newx = Math.min($("#editor").width() - 150, Math.max((elmnt.offsetLeft - pos1), 1));
    elmnt.style.top = newy + "px";
    elmnt.style.left = newx + "px";

    var [currentObject, objectType] = getObjectFromElement(elmnt);

    if (currentView == 1) {
      currentObject.rx = newx;
      currentObject.ry = newy;
    } else {
      currentObject.x = newx;
      currentObject.y = newy;
    }

    moveElement(currentObject, objectType, newx, newy, elmnt)
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}


function refreshCoordinates(g) {
  var newx, newy;
  if (g.element != null) {
    newx = parseInt(g.element.css('left'), 10);
    newy = parseInt(g.element.css('top'), 10);
    if (newx !== "undefined" && newy !== "undefined") {
      if (currentView == 0) {
        g.x = newx;
        g.y = newy;
      } else if (currentView == 1) {
        g.rx = newx;
        g.ry = newy;
      }
    }
  }
}

// TODO: ERDnek még kell. Esetleg megoldani úgy, mint RMnél.
function saveCoordinates() {
  g_entities.forEach(g => {
    refreshCoordinates(g);
  });
  g_attributes.forEach(g => {
    refreshCoordinates(g);
  });
  g_actions.forEach(g => {
    refreshCoordinates(g);
  });
}
//setInterval(saveCoordinates, 500);

/* Modal */
function closeModal() {
  $(currentEdit.element).removeClass("active-edit");
  currentEdit = null;

  $("#editModal").modal("hide");
}

function saveModalEdits() {
  currentEdit.name = $('#editName').prop("value");

  if (currentType == 1) {
    currentEdit.pk = $('#editElsodleges').prop("checked");
    currentEdit.composite = $('#editOsszetett').prop("checked");
    currentEdit.multiValued = $('#editTobbErteku').prop("checked");
    currentEdit.derived = $('#editSzarmaztatott').prop("checked");
    currentEdit.optional = $('#editOptional').prop("checked");

    currentEdit.dataType = $('#editDataType').val();
    currentEdit.dataLength = $('#editDataLength').val();

    if (getObjectFromID(($('#editParent').val()))[0] != currentEdit.parent) {
      setNewParentOfAttribute(currentEdit, getObjectFromID(($('#editParent').val()))[0]);
    }

    if (currentView == 1) {
      if (currentEdit.parent.constructor.name == "Entity") {
        currentEdit.element.html(`<i class="${getIcon(currentEdit)}"></i><span class="rs-anchor left"></span>${currentEdit.name}<span class="rs-anchor right"></span>`);
      } else {
        currentEdit.element.html(`<i class="${getIcon(currentEdit)}"></i>${currentEdit.name}`);
      }
    } else if (currentView == 0) {
      currentEdit.element.html(`<p>${currentEdit.name}</p>` + connStringAttr);
    }

    if (currentEdit.pk) {
      currentEdit.element.addClass("pk");
    } else {
      currentEdit.element.removeClass("pk");
    }

    if (currentView == 0) {
      if (currentEdit.composite) {
        currentEdit.element.addClass("composite");
      } else {
        currentEdit.element.removeClass("composite");
      }

      if (currentEdit.multiValued) {
        currentEdit.element.addClass("multiValued");
      } else {
        currentEdit.element.removeClass("multiValued");
      }

      if (currentEdit.derived) {
        currentEdit.element.addClass("derived");
      } else {
        currentEdit.element.removeClass("derived");
      }

      if (currentEdit.optional) {
        currentEdit.element.addClass("optional");
      } else {
        currentEdit.element.removeClass("optional");
      }
    }
  }

  if (currentType == 2) {
    if (currentView == 0) {
      currentEdit.element.html(`<p>${currentEdit.name}</p>` + connStringAction);
      $(currentEdit.element).find(".conn-extra").prop("id", `action_conn_${currentEdit.id}_extra`);
      $(currentEdit.element).find(".conn-from").prop("id", `action_conn_${currentEdit.id}_from`);
      $(currentEdit.element).find(".conn-to").prop("id", `action_conn_${currentEdit.id}_to`);
    } else if (currentView == 1) {
      $(currentEdit.element).find(".relation-header").html(`${currentEdit.name}`);
    }

    currentEdit.relateFromMany = $('#editFromMany').prop("checked");
    currentEdit.relateFromOptional = $('#editFromOptional').prop("checked");
    currentEdit.relateToMany = $('#editToMany').prop("checked");
    currentEdit.relateToOptional = $('#editToOptional').prop("checked");

    setActionRelation(currentEdit, "from", getObjectFromID(($('#editRelateFrom').val()))[0], getObjectFromID(($('#editRelateFromAttr').val()))[0]) // szoveg frissites miatt jobb ha mindig meghivjuk
    setActionRelation(currentEdit, "to", getObjectFromID(($('#editRelateTo').val()))[0], getObjectFromID(($('#editRelateToAttr').val()))[0])
  }

  if (currentType == 0) {
    if (currentView == 0) {
      currentEdit.element.html(`<p>${currentEdit.name}</p>` + connStringEgyed);
    } else {
      $(currentEdit.element).find(".entity-header").html(`${currentEdit.name}`);
    }
  }

  $(currentEdit.element).children(".conn-base").mousedown(connectorEvent);
  $(currentEdit.element).children(".rs-anchor").mousedown(connectorEvent);

  checkWeakEntities();

  closeModal();
};

var currentEdit;
var currentType;
function popModal(element) {
  [currentEdit, currentType] = getObjectFromElement(element);

  $('#editName').prop("value", currentEdit.name);
  $(currentEdit.element).addClass("active-edit");
  $('#editModal').modal('show');

  $(`#modal-body-0`).hide();
  $(`#modal-body-1`).hide();
  $(`#modal-body-2`).hide();

  $("#modal-body-0 > div > input:checkbox").prop("checked", false);
  $("#modal-body-1 > div > input:checkbox").prop("checked", false);
  $("#modal-body-2 > div > input:checkbox").prop("checked", false);

  $(`#modal-body-${currentType}`).show();
  if (currentType == 1) {
    $('#editDataLength').prop("value", null);
    $('#editParent').empty();
    $('#editParent').append($("<option></option>").attr("value", null).text("-----"));
    $.each(g_entities, function (_, obj) {
      $appendedElem = $('#editParent').append($("<option></option>").attr("value", obj.id).text(obj.name));
    });

    $.each(g_actions, function (_, obj) {
      $appendedElem = $('#editParent').append($("<option></option>").attr("value", obj.id).text(obj.name));
    });

    $('#editDataType').empty();
    $appendedElem = $('#editDataType').append($("<option></option>").attr("value", null).text("-----"));
    $.each(getAllDataTypes(), function (_, obj) {
      $appendedElem = $('#editDataType').append($("<option></option>").attr("value", obj).text(obj));
    });

    if (currentEdit.parent) {
      $('#editParent').val(currentEdit.parent.id).change();
    }

    if (currentEdit.dataType) {
      $('#editDataType').val(currentEdit.dataType).change();
    }

    if (currentEdit.dataLength) {
      $('#editDataLength').val(currentEdit.dataLength).change();
    }

    if (currentEdit.pk) {
      $('#editElsodleges').prop("checked", true);
    }

    if (currentEdit.composite) {
      $('#editOsszetett').prop("checked", true);
    }

    if (currentEdit.multiValued) {
      $('#editTobbErteku').prop("checked", true);
    }

    if (currentEdit.derived) {
      $('#editSzarmaztatott').prop("checked", true);
    }

    if (currentEdit.optional) {
      $('#editOptional').prop("checked", true);
    }
  }

  if (currentType == 2) {
    $('#editRelateFrom').empty();
    $('#editRelateFromAttr').empty();
    $('#editRelateFrom').append($("<option></option>").attr("value", null).text("-----"));
    $.each(g_entities, function (_, obj) {
      $('#editRelateFrom').append($("<option></option>").attr("value", obj.id).text(obj.name));
    });

    $('#editRelateTo').empty();
    $('#editRelateToAttr').empty();
    $('#editRelateTo').append($("<option></option>").attr("value", null).text("-----"));
    $.each(g_entities, function (_, obj) {
      $('#editRelateTo').append($("<option></option>").attr("value", obj.id).text(obj.name));
    });

    $('#editToMany').prop("checked", currentEdit.relateToMany);
    $('#editFromMany').prop("checked", currentEdit.relateFromMany);
    $('#editToOptional').prop("checked", currentEdit.relateToOptional);
    $('#editFromOptional').prop("checked", currentEdit.relateFromOptional);

    if (currentEdit.relateFrom) {
      $('#editRelateFrom').val(currentEdit.relateFrom.id).change();
    }

    if (currentEdit.relateTo) {
      $('#editRelateTo').val(currentEdit.relateTo.id).change();
    }

  }
};

function redrawLines(entity) { // entityre es actionre is megy!
  if (currentView == 0) {
    if (!generated) return; // addig ne probaljunk meglevoket keresni es ujat huzni ameddig nincs legeneralva, kulonben random vonalaink lesznek!
    var svgString;
    if (entity) {
      if (entity.children) { // Hozzaadjuk az uj, meg eddig nem berajzolt vonalakat
        entity.children.forEach(child => {
          if (!$(`#svg_${child.id}_${entity.id}v`).length) { // ha nem letezik, megrajzoljuk
            if (entity.constructor.name == "Action") {
              svgString = `<svg style="top: 0; left: 0;" width="${svgWidth}" height="${svgHeight}" id="svg_${child.id}_${entity.id}v"><line style="position: absolute;" class="vonal" id="line_${child.id}_${entity.id}" x1="${entity.x + 50}" y1="${entity.y - 20}" x2="${child.x + 60}" y2="${child.y + 25}"/></svg>`
            } else {
              svgString = `<svg style="top: 0; left: 0;" width="${svgWidth}" height="${svgHeight}" id="svg_${child.id}_${entity.id}v"><line style="position: absolute;" class="vonal" id="line_${child.id}_${entity.id}" x1="${entity.x + 60}" y1="${entity.y + 25}" x2="${child.x + 60}" y2="${child.y + 25}"/></svg>`
            }
            $('#editor').append(svgString);
            child.connectedLines = []; // attributumhoz csak 1 vonal tartozik majd, relaciohoz mehet tobb is
            child.connectedLines.push($(`#svg_${child.id}_${entity.id}v`)[0]);
            entity.connectedLines.push($(`#svg_${child.id}_${entity.id}v`)[0]);
          };
        });
      }

      if (entity.relationsFrom) {
        entity.relationsFrom.forEach(relation => {
          if (!$(`#svg_${relation.id}_${entity.id}v`).length) {
            if (relation.relateTo == entity) { //jobb/bal oldal index alapjan

              svgString = `<svg style="top: 0; left: 0;" width="${svgWidth}" height="${svgHeight}" id="svg_${relation.id}_${entity.id}v">`;

              svgString += `<line style="position: absolute;" class="vonal" id="line_${relation.id}_${entity.id}_2"
              x2="${relation.x + 140}" y2="${relation.y + 50}" x1="${entity.x + 60}" y1="${entity.y + 25}"/>`;
              svgString += `<line style="position: absolute;" class="vonal notarget" id="line_${relation.id}_${entity.id}_2"
              x2="${relation.x + 120}" y2="${relation.y + 50}" x1="${relation.x + 140}" y1="${relation.y + 50}"/>`;

              svgString += `</svg>`;
              $('#editor').append(svgString);

              relation.relateToLine = ($(`#svg_${relation.id}_${entity.id}v`)[0]);
              entity.connectedLines.push($(`#svg_${relation.id}_${entity.id}v`)[0]);
            }
          };
        });
      }

      if (entity.relationsTo) {
        entity.relationsTo.forEach(relation => {
          if (!$(`#svg_${relation.id}_${entity.id}v_from`).length) {
            if (relation.relateFrom == entity) {
              svgString = `<svg style="top: 0; left: 0;" width="${svgWidth}" height="${svgHeight}" id="svg_${relation.id}_${entity.id}v_from">`
              svgString += `<line style="position: absolute;" class="vonal" id="line_${relation.id}_${entity.id}_2"
              x2="${relation.x - 40}" y2="${relation.y + 50}" x1="${entity.x + 60}" y1="${entity.y + 25}"/>`
              svgString += `<line style="position: absolute;" class="vonal notarget" id="line_${relation.id}_${entity.id}_2"
              x2="${relation.x - 20}" y2="${relation.y + 50}" x1="${relation.x - 40}" y1="${relation.y + 50}"/>`

              svgString += `</svg>`

              $('#editor').append(svgString);
              relation.relateFromLine = ($(`#svg_${relation.id}_${entity.id}v_from`)[0]);
              entity.connectedLines.push($(`#svg_${relation.id}_${entity.id}v_from`)[0]);
            }
          };
        });
      }

      if (entity.relateToLine) {
        if (!entity.relateTo) {
          if (entity.relateToLine.parentNode) {
            entity.relateToLine.parentNode.removeChild(entity.relateToLine);
          }
        }
      }

      if (entity.relateFromLine) {
        if (!entity.relateFrom) {
          if (entity.relateFromLine.parentNode) {
            entity.relateFromLine.parentNode.removeChild(entity.relateFromLine);
          }
        }
      }

      if (entity.connectedLines) { // Kitoroljuk azokat, ahol nincs kapcsolat (mar nem a gyereke az entitynek egy attributum, de meg van vonal)
        entity.connectedLines.forEach(line => {
          var goDelete = true;
          attributumID = line.id.split("_")[1];
          var isFrom = line.id.split("_")[3];
          if (entity.children) {
            if (entity.children.includes(getObjectFromID(attributumID)[0])) {
              goDelete = false;
            }
          }
          if (entity.relationsTo) {
            if (entity.relationsTo.includes(getObjectFromID(attributumID)[0]) && isFrom) {
              goDelete = false;
            }
          }
          if (entity.relationsFrom) {
            if (entity.relationsFrom.includes(getObjectFromID(attributumID)[0]) && !isFrom) {
              goDelete = false;
            }
          }
          if (goDelete) {
            if (line.parentNode) {
              line.parentNode.removeChild(line);
            }
          }
        });
      }
    }
  } else { // RM-nel jobb megoldast talaltam, masikat nezetet at kene majd vinni hasonlokepp, hogy konzisztens legyen
    setView(currentView);
  }
}

function redrawAllLines() {
  if (currentView == 0) {
    g_entities.forEach(entity => {
      redrawLines(entity);
    });

    g_actions.forEach(action => {
      redrawLines(action);
    });
  } else {
    setView(currentView);
  }
}

function makeMainElementsDraggable() {
  $("[id^='entity_div_'][id$='_main']").each(function (i) {
    makeElementDraggable(this);
    $(this).dblclick(function () {
      popModal(this);
    });
    var [obj, tip] = getObjectFromElement(this);
    if (obj) {
      moveElement(obj, tip, currentView == 0 ? obj.x : obj.rx, currentView == 0 ? obj.y : obj.ry, this);
    }
  });

  $("[id^='attribute_p_'][id$='_']").each(function (i) {
    makeElementDraggable(this);
    $(this).dblclick(function (e) {
      e.stopPropagation();
      popModal(this);
    });
  });
};

/* Generalas */
function generateRMFromEntities() {
  var iteration = 0;
  var plusWidth = 0;
  g_entities.forEach(entity => {
    createElementOfEntity(entity, entity.rx || (28 + iteration * 28 + plusWidth), entity.ry || ($("#panel-and-toolbar").height() + 10))
    plusWidth += parseInt($(entity.element).css("width"), 10);
    iteration += 1;
  });

  var iteration = 0;
  var plusWidth = 0;
  g_actions.forEach(action => {
    createElementOfAction(action, action.rx || (28 + iteration * 28 + plusWidth), action.ry || ($("#panel-and-toolbar").height() + 400))
    plusWidth += parseInt($(action.element).css("width"), 10);
    iteration += 1;
  });

  g_attributes.forEach(attribute => {
    if (attribute.parent && attribute.element) {
      if (attribute.pk) {
        attribute.element.addClass("pk");
      } else {
        attribute.element.removeClass("pk");
      }
    }
  });

  makeMainElementsDraggable();
};

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD') // Ékezeteket stb-t eltűnteti
    .trim()
    .replace(/\s+/g, '_') // spacek helyett _
    .replace(/[^\w\-]+/g, '') // minden random karaktert eltuntetunk
    .replace(/\-\-+/g, '_') // tobb ___ helyett egy _
    .substring(0,64); // max 64 karakter egy mysql tablanev
}

function generateTextFromEntities() {
  var query = `<textarea class="form-control textview" rows="16">`

  g_entities.forEach(entity => {
    if (entity.children.length == 0) {return}; // üres entityket skippeljük
    // TODO: relacioknal nem feltetlen lesz skip!

    query += `CREATE TABLE IF NOT EXISTS ${slugify(entity.name)} (\n`;
    entity.children.forEach(attribute => {
      if (attribute.dataType == "-----") {attribute.dataType = null}; 

      query += `\t${slugify(attribute.name)} ${attribute.dataType || "VARCHAR(255)"}`;

      if (attribute.dataLength && attribute.dataType) {
        query += `(${attribute.dataLength})`
      }

      if (!attribute.optional) {
        query += ` NOT NULL`
      }

      if (attribute != entity.children[entity.children.length - 1]) {
        query += `,\n`;
      } else {
        query += ``;
      }
    });

    var first = true;
    entity.children.forEach(attribute => {
      if (attribute.pk) {
        if (first) {
          query += `,\n\tPRIMARY KEY (${slugify(attribute.name)}`;
          first = false;
        } else {
          query += `, ${slugify(attribute.name)}`;
        }
      }
    });
    if (!first) {
      query += `)`;
    }

    query += "\n);\n\n";
  });

  query += `</textarea>`;
  $('#editor').append(query);
}

function getIcon(attr) {
  if (attr) {
    if (attr.dataType) {
      if (DataTypes[0].indexOf(attr.dataType) != -1) {
        return 'fa fa-plus-circle';
      }
      if (DataTypes[1].indexOf(attr.dataType) != -1) {
        return 'fa fa-font';
      }
      if (DataTypes[2].indexOf(attr.dataType) != -1) {
        return 'fa fa-calendar';
      }
      if (DataTypes[3].indexOf(attr.dataType) != -1) {
        return 'fa fa-location-arrow';
      }
      if (DataTypes[4].indexOf(attr.dataType) != -1) {
        return 'fa fa-th';
      }
    }
  }
  return '';
}

const connStringAttr = `<section class="conn-base conn-top"></section><section class="conn-base conn-left"></section><section class="conn-base conn-bottom"></section><section class="conn-base conn-right"></section>`
const connStringEgyed = `<section class="conn-base conn-egyed conn-top"></section><section class="conn-base conn-egyed conn-left"></section><section class="conn-base conn-egyed conn-bottom"></section><section class="conn-base conn-egyed conn-right"></section>`
const connStringAction = `<section class="cardinality"></section><section class="cardinality card-to"></section><section class="conn-base conn-action conn-from" id="a_b_from">bal</section><section class="conn-base conn-action conn-to" id="a_b_to">jobb</section><section class="conn-base conn-action conn-extra" id="a_b_extra">+attr</section>`
function createElementOfEntity(entity, leftPos = 200, topPos = 200) {
  var divString = "";

  if (currentView == 0) {
    divString = `<div id="entity_div_${entity.id}_main" class="egyed" style="left: ${leftPos}px; top: ${topPos}px; position: absolute;"><p>${entity.name}</p>` + connStringEgyed + `</div>`;
    $('#editor').append(divString);
    entity.element = $(`#entity_div_${entity.id}_main`);
    entity.x = leftPos;
    entity.y = topPos;
  }

  if (currentView == 1) {
    divString = `<div id="entity_div_${entity.id}_main" class="entity" style="left: ${leftPos}px; top:${topPos}px;"><div id="entity_div_${entity.id}_main_header" class="entity-header">${entity.name}</div><div class="entity-content">`;
    entity.children.forEach(child => {
      divString += `<p id="attribute_p_${child.id}_" class="rm_attr"><i class="${getIcon(child)}"></i><span class="rs-anchor left"></span>${child.name}<span class="rs-anchor right"></span></p>`
    });
    divString += `</div><div id="entity_div_${entity.id}_main_footer" class="entity-footer"></div></div>`;
    $('#editor').append(divString);
    entity.element = $(`#entity_div_${entity.id}_main`);
    entity.rx = leftPos;
    entity.ry = topPos;
    entity.children.forEach(child => {
      child.element = $(`#attribute_p_${child.id}_`);
      child.rx = leftPos + 100;
      child.ry = topPos + 100; // TODO!!!
    });
  }

  makeMainElementsDraggable();
  checkWeakEntities();
}

function createElementOfAction(action, leftPos = 200, topPos = 200) {
  var svgString;
  if (currentView == 0) {
    divString = `<div id="entity_div_${action.id}_main" class="relacio" style="left: ${leftPos}px; top: ${topPos}px; position: absolute;"><p>${action.name}</p>` + connStringAction + `</div>`;
    $('#editor').append(divString);
    action.element = $(`#entity_div_${action.id}_main`);

    action.x = leftPos;
    action.y = topPos;

    $(action.element).find(".conn-extra").prop("id", `action_conn_${action.id}_extra`);
    $(action.element).find(".conn-from").prop("id", `action_conn_${action.id}_from`);
    $(action.element).find(".conn-to").prop("id", `action_conn_${action.id}_to`);

    if (action.relateTo) { // note: Itt az SVGnel x1 es x2 sorrendje fel van cserelve
      svgString = `<svg style="top: 0; left: 0;" width="${svgWidth}" height="${svgHeight}" id="svg_${action.id}_${action.relateTo.id}v">`

      svgString += `<line style="position: absolute;" class="vonal" id="line_${action.id}_${action.relateTo.id}_2"
       x2="${leftPos + 140}" y2="${topPos + 50}" x1="${action.relateTo.x + 60}" y1="${action.relateTo.y + 25}"/>`
      svgString += `<line style="position: absolute;" class="vonal notarget" id="line_${action.id}_${action.relateTo.id}_2"
       x2="${leftPos + 120}" y2="${topPos + 50}" x1="${leftPos + 140}" y1="${topPos + 50}"/>`

      svgString += `</svg>`

      $('#editor').append(svgString);
      action.relateToLine = ($(`#svg_${action.id}_${action.relateTo.id}v`)[0]);
      action.relateTo.connectedLines.push($(`#svg_${action.id}_${action.relateTo.id}v`)[0]);
    }

    if (action.relateFrom) {
      svgString = `<svg style="top: 0; left: 0;" width="${svgWidth}" height="${svgHeight}" id="svg_${action.id}_${action.relateFrom.id}v_from">`

      svgString += `<line style="position: absolute;" class="vonal" id="line_${action.id}_${action.relateFrom.id}_2"
       x2="${leftPos - 40}" y2="${topPos + 50}" x1="${action.relateFrom.x + 60}" y1="${action.relateFrom.y + 25}"/>`
      svgString += `<line style="position: absolute;" class="vonal notarget" id="line_${action.id}_${action.relateFrom.id}_2"
       x2="${leftPos - 20}" y2="${topPos + 50}" x1="${leftPos - 40}" y1="${topPos + 50}"/>`

      svgString += `</svg>`
      $('#editor').append(svgString);
      action.relateFromLine = ($(`#svg_${action.id}_${action.relateFrom.id}v_from`)[0]);
      action.relateFrom.connectedLines.push($(`#svg_${action.id}_${action.relateFrom.id}v_from`)[0]);
    }

    setActionRelation(action, "to", action.relateTo, action.relateToAttribute); // szoveg frissitese
    setActionRelation(action, "from", action.relateFrom, action.relateFromAttribute); // szoveg frissitese
  } else if (currentView == 1) {
    divString = `<div id="entity_div_${action.id}_main" class="relation" style="left: ${leftPos}px; top: ${topPos}px; position: absolute;"><div id="entity_div_${action.id}_main_header" class="relation-header"><p>${action.name}</p></div>`;

    divString += `<div class="relation-nomodif">`;

    if (action.relateFrom) {
      divString += `<p class="from">[${action.relateFrom.name}] ${action.relateFromAttribute ? action.relateFromAttribute.name : "-"}</p>`;
    }

    if (action.relateTo) {
      divString += `<p class="to">[${action.relateTo.name}] ${action.relateToAttribute ? action.relateToAttribute.name : "-"}</p>`;
    }

    divString += `</div><div class="relation-content">`;
    action.children.forEach(child => {
      divString += `<p id="attribute_p_${child.id}_" class="rm_attr"><i class="${getIcon(child)}"></i>${child.name}</p>`
    });
    divString += `</div><div id="entity_div_${action.id}_main_footer" class="entity-footer"></div></div>`;
    $('#editor').append(divString);

    action.element = $(`#entity_div_${action.id}_main`);

    action.rx = leftPos;
    action.ry = topPos;

    action.children.forEach(child => {
      child.element = $(`#attribute_p_${child.id}_`);
      child.rx = leftPos + 100; // TODO!
      child.ry = topPos + 100;
    });

    if (action.relateFrom && action.relateTo) {
      svgString = `<svg style="top: 0; left: 0;" width="${svgWidth}" height="${svgHeight}" id="svg_${action.id}_${action.relateFrom.id}v_from">`
      svgString += `<line style="position: absolute;" class="vonal" id="line_${action.id}_${action.relateFrom.id}_1" x2="0" y2="0" x1="0" y1="0"/>`
      svgString += `<line style="position: absolute;" class="vonal notarget" id="line_${action.id}_${action.relateFrom.id}_2" x2="0" y2="0" x1="0" y1="0"/>`
      svgString += `<line style="position: absolute;" class="vonal notarget" id="line_${action.id}_${action.relateFrom.id}_3" x2="0" y2="0" x1="0" y1="0"/>`
      svgString += `<line style="position: absolute;" class="vonal notarget" id="line_${action.id}_${action.relateFrom.id}_4" x2="0" y2="0" x1="0" y1="0"/>`
      svgString += `</svg>`
      $('#editor').append(svgString);
      action.relateFromLine = ($(`#svg_${action.id}_${action.relateFrom.id}v_from`)[0]);
      action.relateFrom.connectedLines.push($(`#svg_${action.id}_${action.relateFrom.id}v_from`)[0]);

      svgString = `<svg style="top: 0; left: 0;" width="${svgWidth}" height="${svgHeight}" id="svg_${action.id}_${action.relateTo.id}v">`
      svgString += `<line style="position: absolute;" class="vonal" id="line_${action.id}_${action.relateTo.id}_1" x2="0" y2="0" x1="0" y1="0"/>`;
      svgString += `<line style="position: absolute;" class="vonal notarget" id="line_${action.id}_${action.relateTo.id}_2" x2="0" y2="0" x1="0" y1="0"/>`;
      svgString += `<line style="position: absolute;" class="vonal notarget" id="line_${action.id}_${action.relateTo.id}_3" x2="0" y2="0" x1="0" y1="0"/>`;
      svgString += `<line style="position: absolute;" class="vonal notarget" id="line_${action.id}_${action.relateTo.id}_4" x2="0" y2="0" x1="0" y1="0"/>`;
      svgString += `</svg>`
      $('#editor').append(svgString);
      action.relateToLine = ($(`#svg_${action.id}_${action.relateTo.id}v`)[0]);
      action.relateTo.connectedLines.push($(`#svg_${action.id}_${action.relateTo.id}v`)[0]);
    }
  }

  makeMainElementsDraggable();
}

function createElementOfAttribute(attribute, parent = null, leftPos = 200, topPos = 200) {

  if (currentView == 0) {
    divString = `<div id="entity_div_${attribute.id}_main" class="attributum" style="left: ${leftPos}px; top: ${topPos}px; position: absolute;"><p>${attribute.name}</p>` + connStringAttr + `</div>`;
    $('#editor').append(divString);
    attribute.element = $(`#entity_div_${attribute.id}_main`);
    attribute.x = leftPos;
    attribute.y = topPos;
  }
  setNewParentOfAttribute(attribute, parent);

  makeMainElementsDraggable();
}

var generated = false;
function generateERDFromEntities() {
  var iteration = 0;
  generated = false;
  g_entities.forEach(entity => {

    var leftPos = entity.x || 400;
    var topPos = entity.y || (iteration * 380 + 260);

    createElementOfEntity(entity, leftPos, topPos);

    var innerIteration = 1;
    entity.children.forEach(attribute => { // Pozicionaljuk a hozza tartozo attributumokat kore!
      var theta = ((Math.PI * 2) / entity.children.length)
      var szog = (theta * innerIteration)

      var xpos = attribute.x || (leftPos + 150 * Math.cos(szog));
      var ypos = attribute.y || (topPos + 150 * Math.sin(szog));

      var x1 = leftPos + 60;
      var y1 = topPos + 25;

      var x2 = xpos + 70;
      var y2 = ypos + 35;

      var xmin = 0
      var ymin = 0

      divString = `<div id="entity_div_${attribute.id}_main" class="attributum" style="left: ${xpos}px; top: ${ypos}px; position: absolute;"><p>${attribute.name}</p>` + connStringAttr + `</div>`
      divString += `<svg style="top: ${ymin}; left: ${xmin};" width="${svgWidth}" height="${svgHeight}" id="svg_${attribute.id}_${entity.id}v"><line style="position: absolute;" class="vonal" id="line_${attribute.id}_${entity.id}" x1="${x1 - xmin}" y1="${y1 - ymin}" x2="${x2 - xmin}" y2="${y2 - ymin}"/></svg>`
      $('#editor').append(divString);

      attribute.element = $(`#entity_div_${attribute.id}_main`);

      attribute.connectedLines.push($(`#svg_${attribute.id}_${entity.id}v`)[0]);
      entity.connectedLines.push($(`#svg_${attribute.id}_${entity.id}v`)[0]);

      innerIteration += 1;
    });
    iteration += 1;
  });

  // Árva attribútumokat is rajzoljuk ki :(
  iteration = 0;
  g_attributes.forEach(attribute => {
    if (attribute.parent == null) {
      var divString = `<div id="entity_div_${attribute.id}_main" class="attributum" style="left: ${attribute.x || 10}px; top: ${attribute.y || (iteration * 80 + 60)}px; position: absolute;"><p>${attribute.name}</p>` + connStringAttr + `</div>`
      $('#editor').append(divString);
      attribute.element = $(`#entity_div_${attribute.id}_main`);
      iteration += 1;
    }
  });

  iteration = 0;
  g_actions.forEach(action => {
    var leftPos = action.x || 1000;
    var topPos = action.y || (iteration * 300 + 200);

    createElementOfAction(action, leftPos, topPos);

    innerIteration = 0;
    action.children.forEach(attribute => { // Pozicionaljuk a hozza tartozo attributumokat kore!
      var theta = ((Math.PI * 2) / action.children.length)
      var szog = (theta * innerIteration)
      var xpos = attribute.x || (leftPos + 150 * Math.cos(szog));
      var ypos = attribute.y || (topPos + 150 * Math.sin(szog));

      var x1 = leftPos + 50;
      var y1 = topPos - 20;

      var x2 = xpos + 70;
      var y2 = ypos + 35;

      var xmin = 0;
      var ymin = 0;

      divString = `<div id="entity_div_${attribute.id}_main" class="attributum" style="left: ${xpos}px; top: ${ypos}px; position: absolute;"><p>${attribute.name}</p>` + connStringAttr + `</div>`
      divString += `<svg style="top: ${ymin}; left: ${xmin};" width="${svgWidth}" height="${svgHeight}" id="svg_${attribute.id}_${action.id}v"><line style="position: absolute;" class="vonal" id="line_${attribute.id}_${action.id}" x1="${x1 - xmin}" y1="${y1 - ymin}" x2="${x2 - xmin}" y2="${y2 - ymin}"/></svg>`
      $('#editor').append(divString);

      attribute.element = $(`#entity_div_${attribute.id}_main`);

      attribute.connectedLines.push($(`#svg_${attribute.id}_${action.id}v`)[0]);
      action.connectedLines.push($(`#svg_${attribute.id}_${action.id}v`)[0]);

      innerIteration += 1;
    });
    iteration += 1;
  });

  generated = true;

  makeMainElementsDraggable();
  checkWeakEntities();
  redrawAllLines();
}

function checkWeakEntities() {
  if (currentView != 0) return;
  var vanPK;
  g_entities.forEach(entity => {
    vanPK = false;
    entity.children.forEach(child => {
      if (child.pk) {
        vanPK = true;
      }
    });

    if (entity.element) {
      if (!vanPK) {
        entity.element.addClass("weak");
      } else {
        entity.element.removeClass("weak");
      }
    }
  });
}

function addAttributeClasses() {
  g_attributes.forEach(attribute => {
    if (!attribute.element) { return; };
    if (attribute.pk) {
      attribute.element.addClass("pk");
    } else {
      attribute.element.removeClass("pk");
    }

    if (attribute.composite) {
      attribute.element.addClass("composite");
    } else {
      attribute.element.removeClass("composite");
    }

    if (attribute.multiValued) {
      attribute.element.addClass("multiValued");
    } else {
      attribute.element.removeClass("multiValued");
    }

    if (attribute.derived) {
      attribute.element.addClass("derived");
    } else {
      attribute.element.removeClass("derived");
    }

    if (attribute.optional) {
      attribute.element.addClass("optional");
    } else {
      attribute.element.removeClass("optional");
    }
  });
}

// View valtas
var anchorX = 0;
var anchorY = 0;
function resetView() {
  // Resetelunk nehany global variablet ami problemas lehet
  targetedConnector = null;
  targetedConnectorType = null;
  targetedDirection = null;
  connectBaseObject = null;
  connectActionSide = null;
  moveTogether = [];
  anchorX = 0;
  anchorY = 0;

  $('#editor').empty();
  g_entities.forEach(g => {
    g.connectedLines = [];
  });
  g_attributes.forEach(g => {
    g.connectedLines = [];
  });
  g_actions.forEach(g => {
    g.connectedLines = [];
    g.relateToLine = null;
    g.relateFromLine = null;
  });
}

function setView(newViewValue, second = false) {
  resetView();

  currentView = newViewValue;

  if (newViewValue == 0) {
    generateERDFromEntities();
    addAttributeClasses();
  } else if (newViewValue == 1) {
    generateRMFromEntities();
  } else if (newViewValue == 2) {
    generateTextFromEntities();
  }

  $('.conn-base').mousedown(connectorEvent);
  $('.rs-anchor').mousedown(connectorEvent);

  if (!second) {
    saveCoordinates();
    setView(currentView, true);
  }
}

// Osszekotes vonalakkal
var connectBaseObject = null;
var connectActionSide = null;
function connectorEvent(e) {
  connectBaseObject = getObjectFromElement($(this).parent()[0])[0];

  if ($(this).hasClass("conn-from")) {
    connectActionSide = "from";
  } else if ($(this).hasClass("conn-to")) {
    connectActionSide = "to";
  } else if ($(this).hasClass("conn-extra")) {
    connectActionSide = "extra";
  } else {
    connectActionSide = null;
  }

  if (currentView == 1) {
    anchorX = e.pageX;
    anchorY = e.pageY;
  } else {
    if (connectActionSide != null) {
      anchorY = $(this).parent().offset().top + 70;
      if (connectActionSide == "from") {
        anchorX = $(this).parent().offset().left;
      } else if (connectActionSide == "to") {
        anchorX = $(this).parent().offset().left + 140;
      } else {
        anchorX = $(this).parent().offset().left + 70;
        anchorY = $(this).parent().offset().top;
      }
    } else {
      anchorX = $(this).parent().offset().left + 60;
      anchorY = $(this).parent().offset().top + 25;
    }
  }

  svgString = `<svg style="top: 0; left: 0;" width="${svgWidth}" height="${svgHeight}" id="connectingSvg"><line style="position: absolute;" class="vonal connector" id="line_connector" x1="${anchorX}" y1="${anchorY}" x2="${anchorX}" y2="${anchorY}"/></svg>`
  $('#editor').append(svgString);

  document.onmouseup = stopConnecting; // felengedeskor ne mozgassuk
  document.onmousemove = moveConnectingLine;

  $('.egyed, .attributum, .rm_attr, .conn-to, .conn-from, .conn-extra').mouseover(hoverTargeted).mouseout(unhoverTargeted);

  e.stopPropagation(); // ne tudjuk mozgatni ha az anchorre kattintunk (szulo eventjet ez preventalja)
}

function stopConnecting(e) {
  $('#line_connector')[0].parentNode.removeChild($('#line_connector')[0]);

  document.onmouseup = null;
  document.onmousemove = null;

  $('.egyed, .attributum, .rm_attr, .conn-to, .conn-from, .conn-extra').off("mouseout", unhoverTargeted).off("mouseover", hoverTargeted);

  if (connectBaseObject.parent && currentView == 0) {
    $(connectBaseObject.connectedLines[0].children[0]).removeClass("wrong");
  }


  if (targetedConnector) {
    if (targetedConnector.element) {
      targetedConnector.element.removeClass('active-connector').removeClass('active-action');
      if (targetedConnector.element.parent()) {
        targetedConnector.element.parent().removeClass('active-action');
      }
    }

    if (targetedConnector.parent && currentView == 0) {
      $(targetedConnector.connectedLines[0].children[0]).removeClass('wrong');
    }

    if (currentView == 0) {
      if (connectBaseObject.constructor.name == "Entity" && targetedConnector.constructor.name == "Attribute") {
        setNewParentOfAttribute(targetedConnector, connectBaseObject);
      } else if (connectBaseObject.constructor.name == "Attribute" && targetedConnector.constructor.name == "Entity") {
        setNewParentOfAttribute(connectBaseObject, targetedConnector);
      } else if (connectBaseObject.constructor.name == "Action" && targetedConnector.constructor.name == "Entity" && connectActionSide != "extra") {
        setActionRelation(connectBaseObject, connectActionSide, targetedConnector);
      } else if (connectBaseObject.constructor.name == "Entity" && targetedConnector.constructor.name == "Action" && (targetedDirection == "to" || targetedDirection == "from")) {
        setActionRelation(targetedConnector, targetedDirection, connectBaseObject);
      } else if (connectBaseObject.constructor.name == "Attribute" && targetedConnector.constructor.name == "Action" && targetedDirection == "extra") {
        setNewParentOfAttribute(connectBaseObject, targetedConnector)
      } else if (connectBaseObject.constructor.name == "Action" && targetedConnector.constructor.name == "Attribute" && connectActionSide == "extra") {
        setNewParentOfAttribute(targetedConnector, connectBaseObject)
      }
    } else if (currentView == 1) {
      if (connectBaseObject.constructor.name == "Attribute" && targetedConnector.constructor.name == "Attribute" && targetedConnector.parent.constructor.name == "Entity") {
        ujKapcs = new Action("Kapcs", connectBaseObject.parent, targetedConnector.parent, connectBaseObject, targetedConnector);
        ujKapcs.name = ujKapcs.name + "-" + ujKapcs.id;
        createElementOfAction(ujKapcs, e.pageX - 40, e.pageY + 200);
        popModal(ujKapcs.element[0]);
      }
    }
  }
}

var lastHovered = null;
function moveConnectingLine(e) {
  $('#line_connector')[0].x2.baseVal.value = e.pageX;
  $('#line_connector')[0].y2.baseVal.value = e.pageY;
}

var targetedConnector = null;
var targetedConnectorType = null;
var targetedDirection = null;
function hoverTargeted() {
  [targetedConnector, targetedConnectorType] = getObjectFromElement($(this)[0]);

  if (targetedConnectorType == 2) {
    targetedDirection = $(this)[0].id.split("_")[3];
  }

  if (connectBaseObject == null || targetedConnector == null) { return };

  if (connectBaseObject.constructor.name == "Attribute" && (targetedConnector.constructor.name == "Entity" || targetedConnector.constructor.name == "Action")) {
    if (!connectBaseObject.parent || !$(this).is(connectBaseObject.parent.element)) {
      if (targetedConnector.constructor.name == "Action") {
        if (targetedDirection != 'extra' || (connectBaseObject.parent && $(this).parent().is(connectBaseObject.parent.element))) {
          return;
        }
      }
      $(this).addClass('active-connector');
      $('#line_connector').addClass('good')
      if (connectBaseObject.parent) {
        $(connectBaseObject.connectedLines[0].children[0]).addClass("wrong");
      }
    }
  } else if (connectBaseObject.constructor.name == "Entity" && targetedConnector.constructor.name == "Attribute") {
    if (!connectBaseObject.children.includes(targetedConnector)) {
      $(this).addClass('active-connector');
      $('#line_connector').addClass('good')
      if (targetedConnector.parent) {
        $(targetedConnector.connectedLines[0].children[0]).addClass("wrong");
      }
    }
  } else if (connectBaseObject.constructor.name == "Action" && targetedConnector.constructor.name == "Entity" && connectActionSide != "extra") {
    if (connectBaseObject.relateTo && connectActionSide == "to") {
      if ($(this).is(connectBaseObject.relateTo.element)) {
        return;
      }
    }
    if (connectBaseObject.relateFrom && connectActionSide == "from") {
      if ($(this).is(connectBaseObject.relateFrom.element)) {
        return;
      }
    }
    $(this).addClass('active-connector');
    $('#line_connector').addClass('good')
    if (connectBaseObject.relateTo && connectActionSide == "to") {
      $(connectBaseObject.relateToLine.children).addClass("wrong");
    }
    if (connectBaseObject.relateFrom && connectActionSide == "from") {
      $(connectBaseObject.relateFromLine.children).addClass("wrong");
    }
  } else if (connectBaseObject.constructor.name == "Action" && targetedConnector.constructor.name == "Attribute" && connectActionSide == "extra") {
    if (connectBaseObject.children.includes(targetedConnector)) {
      return;
    }
    $(this).addClass('active-connector');
    $('#line_connector').addClass('good')
    if (targetedConnector.parent) {
      $(targetedConnector.connectedLines[0].children[0]).addClass("wrong");
    }
  } else if (connectBaseObject.constructor.name == "Entity" && targetedConnector.constructor.name == "Action" && targetedDirection != "extra") {
    if (targetedConnector.relateTo && targetedDirection == "to") {
      if (connectBaseObject.element.is(targetedConnector.relateTo.element)) {
        return;
      }
    }
    if (targetedConnector.relateFrom && targetedDirection == "from") {
      if (connectBaseObject.element.is(targetedConnector.relateFrom.element)) {
        return;
      }
    }
    $(this).parent().addClass('active-action');
    $('#line_connector').addClass('good')
    if (targetedConnector.relateTo && targetedDirection == "to") {
      $(targetedConnector.relateToLine.children).addClass("wrong");
    }
    if (targetedConnector.relateFrom && targetedDirection == "from") {
      $(targetedConnector.relateFromLine.children).addClass("wrong");
    }
  }

  if (connectBaseObject.constructor.name == "Attribute" && targetedConnector.constructor.name == "Action" && targetedDirection == "extra") {
    $(this).parent().addClass('active-action'); // Feljebb handled, ez csak +
  }

  if (currentView == 1) {
    if (connectBaseObject.constructor.name == "Attribute" && targetedConnector.constructor.name == "Attribute" && targetedConnector.parent.constructor.name == "Entity") {
      if (!connectBaseObject.parent || !$(this).is(connectBaseObject.parent.element)) {
        $(this).addClass('active-connector');
        $('#line_connector').addClass('good')
      }
    }
  }
}

function unhoverTargeted() {
  $(this).removeClass('active-connector');

  if ($(this).parent()) {
    $(this).parent().removeClass('active-action');
  }

  $('#line_connector').removeClass('good')

  if (connectBaseObject.parent && currentView == 0) {
    $(connectBaseObject.connectedLines[0].children[0]).removeClass("wrong");
  }

  if (targetedConnector && currentView == 0) {
    if (targetedConnector.parent) {
      $(targetedConnector.connectedLines[0].children[0]).removeClass('wrong');
    }
  }

  if (targetedConnector) {
    if (targetedConnector.relateTo && targetedDirection == "to") {
      $(targetedConnector.relateToLine.children).removeClass("wrong");
    }
    if (targetedConnector.relateFrom && targetedDirection == "from") {
      $(targetedConnector.relateFromLine.children).removeClass("wrong");
    }
  }

  if (connectBaseObject.relateTo && connectActionSide == "to") {
    $(connectBaseObject.relateToLine.children).removeClass("wrong");
  }
  if (connectBaseObject.relateFrom && connectActionSide == "from") {
    $(connectBaseObject.relateFromLine.children).removeClass("wrong");
  }

  targetedConnector = null;
}

// Teszt
/* TODO: Remove
teszt = new Entity("Ember");
teszt.addAttribute("Vezetéknév teszt");
teszt.addAttribute("Keresztnév teszt hosszú szövegre");
teszt.addAttribute("Születési dátum teszt hosszú szövegre, sőt még annál is hosszabbra");
teszt.addAttribute("Nem");
teszt.addAttribute("Telefonszám");
teszt2 = new Entity("Háziállat");
teszt2.addAttribute("Név");
teszt2.addAttribute("Fajta");
teszt3 = new Entity("Weboldal");
teszt4 = new Entity("Autó");
teszt4.addAttribute("Típus");

tesztac = new Action("Van", teszt, teszt2)
tesztac.addAttribute("Dátum")

tesztac = new Action("Van valami teszt asd qwe", teszt4, teszt4)

new Attribute("Árva");
new Attribute("Árva 2");
*/

var shiftDown = false;
window.addEventListener('keyup', (e) => { shiftDown = e.shiftKey });
window.addEventListener('keydown', (e) => { shiftDown = e.shiftKey });

function _confirm(szoveg) {
  return shiftDown ? true : confirm(szoveg);
}

// Indulaskor:
$(function () {
  $('#changeView input').on('change', function () {
    setView($('input[name=viewOptions]:checked', '#changeView').val());
  });

  // Elso nezet
  setView(currentView);

  // Minimap konfiguralasa
  pagemap(document.querySelector('#map'), {
    viewport: null,
    styles: {
      'div': 'rgba(100,100,100,0.8)',
    },
    back: '#8AD2FFAA',
    view: 'rgba(255,255,255,0.2)',
    drag: 'rgba(255,255,255,0.4)',
    interval: 1,
  });

  // Modal event
  $('#editModal').on("keyup", function (event) {
    if (event.keyCode === 13) {
      saveModalEdits();
    }
  });

  $('#editModal').on('hide.bs.modal', function (e) {
    if (currentEdit) {
      $(currentEdit.element).removeClass("active-edit");
    }
  })

  $("#editRelateFrom").change(function () {
    $('#editRelateFromAttr').empty();
    $('#editRelateFromAttr').append($("<option></option>").attr("value", null).text("-----"));
    if (getObjectFromID(($('#editRelateFrom').val()))[0]) {
      getObjectFromID(($('#editRelateFrom').val()))[0].children.forEach(attr => {
        $('#editRelateFromAttr').append($("<option></option>").attr("value", attr.id).text(attr.name));
      });
    }
    if (currentEdit) {
      if (currentEdit.relateFromAttribute) {
        $('#editRelateFromAttr').val(currentEdit.relateFromAttribute.id).change();
      }
    }
  });

  $("#editRelateTo").change(function () {
    $('#editRelateToAttr').empty();
    $('#editRelateToAttr').append($("<option></option>").attr("value", null).text("-----"));
    if (getObjectFromID(($('#editRelateTo').val()))[0]) {
      getObjectFromID(($('#editRelateTo').val()))[0].children.forEach(attr => {
        $('#editRelateToAttr').append($("<option></option>").attr("value", attr.id).text(attr.name));
      });
    }
    if (currentEdit) {
      if (currentEdit.relateToAttribute) {
        $('#editRelateToAttr').val(currentEdit.relateToAttribute.id).change();
      }
    }
  });

  // Jobb kattintas
  new BootstrapMenu('#editor', {
    actions: [{
      iconClass: 'fa-plus',
      name: 'Új egyed...',
      isEnabled: false,
      onClick: function () {
        var ujEgyed = new Entity("Egyed-");
        ujEgyed.name = ujEgyed.name + ujEgyed.id;
        createElementOfEntity(ujEgyed, event.pageX - 40, event.pageY - 30);
        popModal(ujEgyed.element[0]);
      },
      isShown: function (row) {
        return currentView == 0;
      }
    }, {
      iconClass: 'fa-plus',
      name: 'Új attribútum...',
      onClick: function () {
        var ujAttr = new Attribute("Attr-");
        ujAttr.name = ujAttr.name + ujAttr.id;
        createElementOfAttribute(ujAttr, null, event.pageX - 40, event.pageY - 30);
        popModal(ujAttr.element[0]);
      },
      isShown: function (row) {
        return currentView == 0;
      }
    }, {
      iconClass: 'fa-plus',
      name: 'Új kapcsolat...',
      onClick: function () {
        var ujKapcs = new Action("Kapcs-");
        ujKapcs.name = ujKapcs.name + ujKapcs.id;
        createElementOfAction(ujKapcs, event.pageX - 40, event.pageY - 30);
        popModal(ujKapcs.element[0]);
      },
      isShown: function (row) {
        return currentView == 0;
      }
    }]
  });

  new BootstrapMenu('.vonal', {
    fetchElementData: function ($rowElem) {
      return $rowElem[0];
    },
    actions: [{
      iconClass: 'fa-trash',
      name: 'Törlés',
      onClick: function (elem) {
        var obj = getObjectFromID(elem.id.split("_")[1])[0];
        if (obj) {
          if (obj.constructor.name == "Attribute") {
            var oldParent = obj.parent;

            if (!_confirm(`Biztosan megszűnteted a kapcsolatot a(z) '${oldParent.name}' és '${obj.name}' között?`)) {
              return;
            }

            setNewParentOfAttribute(obj, null)

            if (oldParent) {
              redrawLines(oldParent);
            }
          } else if (obj.constructor.name == "Action") {
            if (elem == obj.relateToLine.children[0]) {
              if (!_confirm(`Biztosan megszűnteted a kapcsolatot a(z) '${obj.relateTo.name}' és '${obj.name}' között?`)) {
                return;
              }

              setActionRelation(obj, "to", null);
              redrawLines(obj);
            } else if (elem == obj.relateFromLine.children[0]) {
              if (!_confirm(`Biztosan megszűnteted a kapcsolatot a(z) '${obj.relateFrom.name}' és '${obj.name}' között?`)) {
                return;
              }

              setActionRelation(obj, "from", null);
              redrawLines(obj);
            }
          }
        }
      }
    }]
  });

  new BootstrapMenu('.egyed, .entity-header, .relacio', {
    fetchElementData: function ($rowElem) {
      return $rowElem[0];
    },
    actions: [{
      iconClass: 'fa-plus',
      name: 'Új attribútum...',
      onClick: function (elem) {
        var ujAttr = new Attribute("Attr-");
        ujAttr.name = ujAttr.name + ujAttr.id;
        createElementOfAttribute(ujAttr, getObjectFromElement(elem)[0], event.pageX - 40, event.pageY - 30);
        popModal(ujAttr.element[0]);
      }
    }, {
      iconClass: 'fa-pencil',
      name: 'Módosítás...',
      onClick: function (elem) {
        popModal(elem);
      }
    }, {
      iconClass: 'fa-arrows-alt',
      name: 'Együtt mozgatás attribútumokkal', // classNames: 'unimplemented' szürkít
      classNames: function (elem) {
        if (moveTogether[elem.id]) {
          return 'green';
        } else {
          return 'red';
        }
      },
      onClick: function (elem) {
        if (moveTogether[elem.id]) {
          moveTogether[elem.id] = false;
        } else {
          moveTogether[elem.id] = true;
        }
      }
    }, {
      iconClass: 'fa-trash',
      name: 'Törlés',
      onClick: function (elem) {
        var egyed = getObjectFromElement(elem)[0];

        if (!_confirm(`Biztosan törlöd: '${egyed.name}'?`)) {
          return;
        }

        deleteEntity(egyed, false);
      },
    }, {
      iconClass: 'fa-trash',
      name: 'Törlés attribútumokkal',
      onClick: function (elem) {
        var egyed = getObjectFromElement(elem)[0];

        if (!_confirm(`Biztosan törlöd az összes attribútummal együtt: '${egyed.name}'?`)) {
          return;
        }

        deleteEntity(egyed, true);
      },
    }]
  });

  new BootstrapMenu('.attributum, .rm_attr', {
    fetchElementData: function ($rowElem) {
      return $rowElem[0];
    },
    actions: [{
      iconClass: 'fa-pencil',
      name: 'Módosítás...',
      onClick: function (elem) {
        popModal(elem);
      }
    }, {
      iconClass: 'fa-trash',
      name: 'Attribútum törlése',
      onClick: function (elem) {
        var attr = getObjectFromElement(elem)[0];

        if (!_confirm(`Biztosan törlöd a(z) '${attr.name}' nevű attribútumot?`)) {
          return;
        }

        deleteAttribute(attr);
      },
    }]
  });

  var data = localStorage.getItem('savedata');
  if (data) {
    loadData(data);
  }
})

function autoSave() {
  localStorage.setItem("savedata", saveData(true));
}
setInterval(autoSave, 3000);

function saveType(the_type, curr) {
  var saveObject;
  var maxid = g_id;
  if (the_type == "Entity") {
    saveObject = new Entity("DUMMY_SAVE_OBJ");
  } else if (the_type == "Attribute") {
    saveObject = new Attribute("DUMMY_SAVE_OBJ");
  } else if (the_type == "Action") {
    saveObject = new Action("DUMMY_SAVE_OBJ");
  }

  Object.keys(curr).forEach(key => {
    var skip = false;
    dontSave.forEach(permitted_str => {
      if (key.indexOf(permitted_str) != -1) {
        skip = true;
      }
    });

    if (skip) return; // continue lenyegeben foreachnel

    if (typeof (curr[key]) == "object") {
      if (Array.isArray(curr[key])) {
        saveObject[key] = [];
        curr[key].forEach(element => {
          if (element != null) {
            saveObject[key].push(element.id);
          }
        });
      } else {
        if (curr[key] != null) {
          saveObject[key] = curr[key].id;
        }
      }
    } else {
      saveObject[key] = curr[key];
    }
  });
  g_id = maxid; // Ne menjen fel mindig az autosave miatt.
  return saveObject;
}

function copyToClipboard() {
  var copyText = document.getElementById("saveArea");
  copyText.select();
  copyText.setSelectionRange(0, 99999);
  document.execCommand("copy");
}

const dontSave = ["element", "relateToLine", "relateFromLine", "connectedLines"]
function saveData(inbackground = false) {
  if (!inbackground) {
    $('#saveModal').modal("show");
  }

  savedData = [];
  savedEntities = [];
  savedAttributes = [];
  savedActions = [];

  g_entities.forEach(curr => {
    savedEntities.push(saveType("Entity", curr));
  });

  g_attributes.forEach(curr => {
    savedAttributes.push(saveType("Attribute", curr));
  });

  g_actions.forEach(curr => {
    savedActions.push(saveType("Action", curr));
  });

  savedData.push(savedEntities, savedAttributes, savedActions);

  var jsonString = JSON.stringify(savedData);
  var enc = Base64.encode(jsonString);

  if (!inbackground) {
    $('#saveArea').val(enc);
  }

  return enc;
}

function loadEmpty() {
  loadData("W1tdLFtdLFtdXQ==");
}

function loadData(enc = null) {
  enc = enc || $('#saveArea').val();
  try {
    var dec = Base64.decode(enc);
    var jsonObj = JSON.parse(dec);
  } catch (err) {
    alert("Hibás betöltés, a string nem megfelelő!");
    return;
  }

  resetView();

  g_entities = [];
  g_attributes = [];
  g_actions = [];
  g_id = 0;

  var maxid = 0;

  jsonObj[0].forEach(loadingObject => {
    var newObject = new Entity(loadingObject.name);
    Object.keys(loadingObject).forEach(key => {
      newObject[key] = loadingObject[key];
    });
    maxid = Math.max(newObject.id, maxid);
  });

  jsonObj[1].forEach(loadingObject => {
    var newObject = new Attribute(loadingObject.name);
    Object.keys(loadingObject).forEach(key => {
      newObject[key] = loadingObject[key];
    });
    maxid = Math.max(newObject.id, maxid);
  });

  jsonObj[2].forEach(loadingObject => {
    var newObject = new Action(loadingObject.name);
    Object.keys(loadingObject).forEach(key => {
      newObject[key] = loadingObject[key];
    });
    maxid = Math.max(newObject.id, maxid);
  });

  g_entities.forEach(entity => {
    Object.keys(entity).forEach(key => {
      if (Array.isArray(entity[key])) {
        var newArray = [];
        entity[key].forEach(id => {
          newArray.push(getObjectFromID(id)[0]);
        });
        entity[key] = newArray;
      }
    });
  });

  g_attributes.forEach(attribute => {
    Object.keys(attribute).forEach(key => {
      if (Array.isArray(attribute[key])) {
        var newArray = [];
        attribute[key].forEach(id => {
          newArray.push(getObjectFromID(id)[0]);
        });
        attribute[key] = Array();
      }
    });
    attribute.parent = getObjectFromID(attribute.parent)[0];
  });

  g_actions.forEach(action => {
    Object.keys(action).forEach(key => {
      if (Array.isArray(action[key])) {
        var newArray = [];
        action[key].forEach(id => {
          newArray.push(getObjectFromID(id)[0]);
        });
        action[key] = newArray;
      }
    });
    action.relateTo = getObjectFromID(action.relateTo)[0];
    action.relateFrom = getObjectFromID(action.relateFrom)[0];
  });

  g_id = maxid;
  setView(currentView);
}

function autoPosition() {
  if (confirm('Biztosan automatikusan szeretnéd pozicionálni az összes elemet?\nWIP funkcionalitás, érdekes elrendezések születhetnek!')) {
    if (currentView == 0) {
      g_entities.forEach(g => {
        g.x = 0;
        g.y = 0;
      });
      g_attributes.forEach(g => {
        g.x = 0;
        g.y = 0;
      });
      g_actions.forEach(g => {
        g.x = 0;
        g.y = 0;
      });
    } else if (currentView == 1) {
      g_entities.forEach(g => {
        g.rx = 0;
        g.ry = 0;
      });
      g_attributes.forEach(g => {
        g.rx = 0;
        g.ry = 0;
      });
      g_actions.forEach(g => {
        g.rx = 0;
        g.ry = 0;
      });
    }
    setView(currentView);
  }
}