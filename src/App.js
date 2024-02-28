import React, { useEffect, useState } from "react";
import PrismaZoom from "react-prismazoom";
import {
  Tooltip,
  Box,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Button,
  IconButton,
  Paper,
  Menu,
} from "@material-ui/core";

import CancelIcon from "@material-ui/icons/Cancel";
import WrapTextIcon from "@material-ui/icons/WrapText";
import WbCloudyIcon from "@material-ui/icons/WbCloudy";

import { withStyles } from "@material-ui/core/styles";
import Draggable from "react-draggable";

const getAuthHeaders = () => {
  const headers = new Headers();
  headers.set("Authorization", "Basic " + btoa("palrich" + ":" + "testpass"));
  return headers;
};

const roomGrid = [100, 60];
const imageDimensions = [roomGrid[0] * 70, roomGrid[1] * 100];
const awsEndpoint = process.env.REACT_APP_AWS_ENDPOINT;

function centerRooms(rooms) {
  rooms = [...rooms];
  const yBounds = [
    Math.min(...rooms.map((room) => room.editor_grid_y)),
    Math.max(...rooms.map((room) => room.editor_grid_y)),
  ];
  const xBounds = [
    Math.min(...rooms.map((room) => room.editor_grid_x)),
    Math.max(...rooms.map((room) => room.editor_grid_x)),
  ];
  rooms.forEach((room) => {
    room.editor_grid_x -=
      xBounds[1] - Math.floor((xBounds[1] - xBounds[0]) / 2);
    room.editor_grid_y -=
      yBounds[1] - Math.floor((yBounds[1] - yBounds[0]) / 2);
  });
  return rooms;
}

const areaDataReducer = ({ areaVnum, areaData, editData }, action) => {
  switch (action.type) {
    case "SET_AREA_VNUM":
      areaVnum = action.payload;
      break;
    case "SET_AREA":
      areaData = action.payload;
      break;
    case "AREA_UPDATED":
      areaData = { ...areaData };
      break;
    case "ROOM_MOVED":
      fetch(
        `http://localhost:4001/builderweb/api/areas/${areaVnum}/rooms/${action.payload.vnum}`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            vnum: action.payload.vnum,
            editor_grid_x: action.payload.editor_grid_x,
            editor_grid_y: action.payload.editor_grid_y,
          }),
        }
      );
      break;
    case "CENTER_ROOMS":
      areaData.rooms = centerRooms(areaData?.rooms || []);
      break;
    case "EDIT":
      editData = { ...action?.payload };
      break;
    case "CLEAR_EDIT":
      editData = {};
      break;
    default:
      break;
  }
  return { areaVnum: areaVnum, areaData: areaData, editData: editData };
};

const AreaEditorContext = React.createContext();

function shuffled(lst) {
  return lst
    .map((item) => ({ item, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);
}

function wordWrap(str) {
  str = str.replaceAll(/\r/g, "");
  str = str.replaceAll(/\n\n+/g, "\n\n");
  return (
    str
      .split("\n\n")
      .map((paragraph) => {
        paragraph = paragraph
          .replaceAll(/^([a-z])/g, (str, g) => g.toUpperCase())
          .replaceAll(/\s+/g, " ")
          .replaceAll(
            /([.!?]) ([a-z])/g,
            (str, g1, g2) => g1 + " " + g2.toUpperCase()
          );
        let r = "";
        let line = "";
        paragraph.split(/\s+/g).forEach((w) => {
          const newlen = line.length + w.length + 1;
          if (newlen > 76) {
            if (newlen - 76 < w.length) {
              r += line + w + "\n";
              line = "";
            } else {
              r += line + "\n";
              line = w + " ";
            }
          } else {
            line += w + " ";
          }
        });
        if (line) {
          r += line + "\n";
        }
        return r;
      })
      .join("\n")
      .trim() + "\n"
  );
}

function initialPos(rooms) {
  var roomMap = rooms.reduce((acc, cur) => ({ ...acc, [cur.vnum]: cur }), {});
  var taken = rooms
    .filter((room) => room.editor_grid_x && room.editor_grid_y)
    .reduce(
      (acc, cur) => ({
        ...acc,
        [cur.editor_grid_x + " " + cur.editor_grid_y]: true,
      }),
      {}
    );
  var toPlace = rooms.filter(
    (room) =>
      room.editor_grid_x === undefined && room.editor_grid_y === undefined
  );
  const tryPlace = (vnum, newX, newY) => {
    if (!(vnum in roomMap) || taken[newX + " " + newY]) {
      return;
    }
    const room = roomMap[vnum];
    if (room.editor_grid_x || room.editor_grid_y) {
      taken[room.editor_grid_x + " " + room.editor_grid_y] = false;
    }
    room.editor_grid_x = newX;
    room.editor_grid_y = newY;
    taken[room.editor_grid_x + " " + room.editor_grid_y] = true;
  };
  toPlace.forEach((room) => {
    if (room.editor_grid_x === undefined || room.editor_grid_y === undefined) {
      while (true) {
        room.editor_grid_x = Math.floor(Math.random() * 16) - 8;
        room.editor_grid_y = Math.floor(Math.random() * 16) - 8;
        if (taken[room.editor_grid_x + " " + room.editor_grid_y]) {
          continue;
        }
        taken[room.editor_grid_x + " " + room.editor_grid_y] = true;
        break;
      }
    }
  });
  for (var i = 0; i <= 25; i++) {
    shuffled(toPlace).forEach((room) => {
      Object.entries(room.exits).forEach(([dir, exit]) => {
        switch (dir.toLowerCase()) {
          case "north":
            tryPlace(exit.to, room.editor_grid_x, room.editor_grid_y - 2);
            break;
          case "south":
            tryPlace(exit.to, room.editor_grid_x, room.editor_grid_y + 2);
            break;
          case "west":
            tryPlace(exit.to, room.editor_grid_x - 2, room.editor_grid_y);
            break;
          case "east":
            tryPlace(exit.to, room.editor_grid_x + 2, room.editor_grid_y);
            break;
          case "southwest":
            tryPlace(exit.to, room.editor_grid_x - 2, room.editor_grid_y - 2);
            break;
          case "northeast":
            tryPlace(exit.to, room.editor_grid_x + 2, room.editor_grid_y + 2);
            break;
          case "northwest":
            tryPlace(exit.to, room.editor_grid_x - 2, room.editor_grid_y + 2);
            break;
          case "southeast":
            tryPlace(exit.to, room.editor_grid_x + 2, room.editor_grid_y - 2);
            break;
          case "up":
            tryPlace(exit.to, room.editor_grid_x - 1, room.editor_grid_y - 1);
            tryPlace(exit.to, room.editor_grid_x + 1, room.editor_grid_y - 1);
            break;
          case "down":
            tryPlace(exit.to, room.editor_grid_x + 1, room.editor_grid_y + 1);
            tryPlace(exit.to, room.editor_grid_x - 1, room.editor_grid_y + 1);
            break;
          default:
            break;
        }
      });
    });
  }
}

const dirInfo = {
  north: { rev: "south", abbr: "n", offsets: { x: 50, y: 10 } },
  south: { rev: "north", abbr: "s", offsets: { x: 50, y: 50 } },
  east: { rev: "west", abbr: "e", offsets: { x: 90, y: 30 } },
  west: { rev: "east", abbr: "w", offsets: { x: 10, y: 30 } },
  northwest: { rev: "southeast", abbr: "nw", offsets: { x: 10, y: 10 } },
  northeast: { rev: "southwest", abbr: "ne", offsets: { x: 90, y: 10 } },
  southeast: { rev: "northwest", abbr: "se", offsets: { x: 90, y: 50 } },
  southwest: { rev: "northeast", abbr: "sw", offsets: { x: 10, y: 50 } },
  up: { rev: "down", abbr: "u", offsets: { x: 30, y: 7 } },
  down: { rev: "up", abbr: "d", offsets: { x: 30, y: 52 } },
};

const sectors = {
  inside: { color: "#CCCCCC" },
  city: { color: "#666666" },
  field: { color: "#CCFF66" },
  forest: { color: "#006600" },
  hills: { color: "#999933" },
  mountain: { color: "#663300" },
  swim: { color: "#66CCFF" },
  noswim: { color: "#66CCFF" },
  unused: { color: "white" },
  air: { color: "#FFFFCC" },
  desert: { color: "#CC9966" },
  underwater: { color: "#000099" },
  tundra: { color: "#6699CC" },
  cave: { color: "black" },
  exotic: { color: "#CC66CC" },
};

const exitFlags = [
  "door",
  "closed",
  "locked",
  "pickproof",
  "nopass",
  "easy",
  "hard",
  "infuriating",
  "noclose",
  "nolock",
  "nobash",
  "hidden",
];

const roomFlags = [
  "bank",
  "dark",
  "no_mob",
  "indoors",
  "no_magic",
  "private",
  "safe",
  "solitary",
  "pet_shop",
  "no_recall",
  "imp_only",
  "gods_only",
  "heroes_only",
  "newbies_only",
  "arena",
  "nowhere",
  "holy",
  "available",
  "spectator",
  "home_allow",
  "no_home",
  "no_quest",
];

const EditForm = (props) => {
  return (
    <Paper
      style={{
        position: "absolute",
        width: 600,
        top: 58,
        bottom: 0,
        right: 0,
        overflowY: "scroll",
        overflowX: "hidden",
        padding: 20,
      }}
    >
      {props.children}
    </Paper>
  );
};

const ExitLine = ({ from, to, fromDoor }) => {
  const toDoor = dirInfo[fromDoor].rev;

  return (
    <line
      marker-end="url(#arrow)"
      x1={
        imageDimensions[0] / 2 +
        from.editor_grid_x * roomGrid[0] +
        dirInfo[fromDoor].offsets.x
      }
      y1={
        imageDimensions[1] / 2 +
        from.editor_grid_y * roomGrid[1] +
        dirInfo[fromDoor].offsets.y
      }
      x2={
        imageDimensions[0] / 2 +
        to.editor_grid_x * roomGrid[0] +
        dirInfo[toDoor].offsets.x
      }
      y2={
        imageDimensions[1] / 2 +
        to.editor_grid_y * roomGrid[1] +
        dirInfo[toDoor].offsets.y
      }
      stroke="#0099FF"
      strokeWidth={2}
      style={{ pointerEvents: "none" }}
    />
  );
};

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && children}
    </div>
  );
}

const StyledTableCell = withStyles((theme) => ({
  head: {
    backgroundColor: theme.palette.common.black,
    color: theme.palette.common.white,
  },
  body: {
    fontSize: 14,
  },
}))(TableCell);

const StyledTableRow = withStyles((theme) => ({
  root: {
    "&:nth-of-type(odd)": {
      backgroundColor: theme.palette.action.hover,
    },
  },
}))(TableRow);

const GridLines = ({ props }) => {
  const center = [imageDimensions[0] / 2, imageDimensions[1] / 2];

  return Array.from(Array(imageDimensions[0] / roomGrid[0]))
    .map((x, i) => (
      <line
        x1={i * roomGrid[0]}
        y1={0}
        x2={i * roomGrid[0]}
        y2={imageDimensions[1]}
        stroke="#DDD"
        key={"horiz-grid-" + i}
        style={{ pointerEvents: "none" }}
      />
    ))
    .concat(
      Array.from(Array(imageDimensions[1] / roomGrid[1])).map((x, i) => (
        <line
          y1={i * roomGrid[1]}
          x1={0}
          y2={i * roomGrid[1]}
          x2={imageDimensions[0]}
          stroke="#DDD"
          key={"vert-grid-" + i}
          style={{ pointerEvents: "none" }}
        />
      ))
    )
    .concat([
      <rect
        x={center[0]}
        y={center[1]}
        width={roomGrid[0]}
        height={roomGrid[1]}
        stroke="black"
        strokeWidth="1"
        fill="white"
      />,
    ]);
};

const Room = ({ room, setIsSomethingDragging }) => {
  const { editData, dispatch } = React.useContext(AreaEditorContext);
  const [dragging, setDragging] = React.useState(false);

  const exitColor = (room, dir) => {
    const exit = room?.exits[dir];
    if (exit) {
      if (exit.flags?.includes("locked")) {
        return "red";
      } else if (exit.flags?.includes("closed")) {
        return "orange";
      } else if (exit.flags?.includes("door")) {
        return "yellow";
      } else if (exit?.to) {
        return "#AAA";
      }
    }
    return "white";
  };

  const updatePosition = (room, eventData) => {
    room.editor_grid_x = (eventData.x - imageDimensions[0] / 2) / roomGrid[0];
    room.editor_grid_y = (eventData.y - imageDimensions[1] / 2) / roomGrid[1];
    dispatch({ type: "AREA_UPDATED" });
  };

  const clickRoom = (room) => {
    if (dragging) {
      return;
    }
    if (editData && editData.mode === "exit" && !editData?.data?.to) {
      dispatch({
        type: "EDIT",
        payload: { ...editData, data: { ...editData.data, to: room.vnum } },
      });
    } else {
      dispatch({ type: "EDIT", payload: { mode: "room", data: room } });
    }
  };

  if (room.vnum === 1249) {
    console.log(imageDimensions[0] / 2, imageDimensions[1] / 2);
    console.log(
      room.editor_grid_x,
      room.editor_grid_y,
      imageDimensions[0] / 2 + room.editor_grid_x * roomGrid[0],
      imageDimensions[1] / 2 + room.editor_grid_y * roomGrid[1]
    );
  }

  return (
    <Draggable
      position={{
        x: imageDimensions[0] / 2 + room.editor_grid_x * roomGrid[0],
        y: imageDimensions[1] / 2 + room.editor_grid_y * roomGrid[1],
      }}
      grid={roomGrid}
      onDrag={(e, data) => {
        setDragging(true);
        return updatePosition(room, data);
      }}
      onStop={(e, data) => {
        setIsSomethingDragging(false);
        dispatch({ type: "ROOM_MOVED", payload: room });
        return updatePosition(room, data);
      }}
      onMouseDown={(e) => {
        setIsSomethingDragging(true);
        setDragging(false);
        e.stopPropagation();
      }}
      key={"room-" + room.vnum}
    >
      <svg
        width={roomGrid[0]}
        height={roomGrid[1]}
        id={"room-" + room.vnum}
        onClick={() => clickRoom(room)}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            fill="#0099FF"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 6 5 L 0 10 z" />
          </marker>
        </defs>
        <rect
          x={10}
          y={10}
          width={80}
          height={10}
          stroke="black"
          fill={sectors[room.sector].color}
          strokeWidth="1"
        />
        <rect
          x={10}
          y={10}
          width={80}
          height={40}
          stroke={
            editData?.data?.mode === "room" && editData.data.vnum === room.vnum
              ? "red"
              : "black"
          }
          strokeWidth={
            editData?.data?.mode === "room" && editData.data.vnum === room.vnum
              ? 3
              : 1
          }
          fill="transparent"
        />
        {Object.keys(dirInfo).map((dir) => (
          <>
            <rect
              className={"exitCircle"}
              key={"exit-" + room.vnum + "-" + dir}
              x={dirInfo[dir].offsets.x - 5}
              y={dirInfo[dir].offsets.y - 5}
              width={10}
              height={10}
              rx={2}
              fill={exitColor(room, dir)}
              strokeWidth={0.5}
              onClick={(e) => {
                e.stopPropagation();
                if (!(dir in room.exits) || !room.exits[dir].to) {
                  room.exits[dir] = { to: null };
                }
                dispatch({
                  type: "EDIT",
                  payload: {
                    mode: "exit",
                    data: room.exits[dir],
                    room: room,
                    dir: dir,
                  },
                });
              }}
            />
            <text
              x={dirInfo[dir].offsets.x}
              y={dirInfo[dir].offsets.y + 2}
              textAnchor="middle"
              style={{ fontSize: 7, pointerEvents: "none" }}
            >
              {dirInfo[dir].abbr}
            </text>
          </>
        ))}
        <text
          x="20"
          y="28"
          style={{
            fontSize: 7,
            pointerEvents: "none",
            width: 50,
            overflow: "hidden",
          }}
        >
          {room.name}
        </text>
      </svg>
    </Draggable>
  );
};

function AreaEditor({ style }) {
  const { areaData, editData, dispatch } = React.useContext(AreaEditorContext);
  const [isSomethingDragging, setIsSomethingDragging] = React.useState(false);

  const roomMap = React.useMemo(
    () =>
      areaData?.rooms &&
      Object.fromEntries(areaData.rooms.map((room) => [room.vnum, room])),
    [areaData]
  );

  const lines = React.useMemo(() => {
    return areaData?.rooms
      ?.map((room) =>
        Object.entries(room.exits).map(([door, exit]) => {
          const from = roomMap[room.vnum];
          const to = roomMap[exit.to];
          if (from && to) {
            return (
              <ExitLine
                fromDoor={door}
                from={from}
                to={to}
                stroke="red"
                key={"exit-" + room.vnum + "-" + door}
              />
            );
          } else {
            return <></>;
          }
        })
      )
      .flat(1);
  }, [areaData, roomMap]);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "white",
        alignItems: "center",
        justifyContent: "center",
        display: "flex",
        overflow: "hidden",
      }}
    >
      <PrismaZoom allowPan={!isSomethingDragging}>
        <svg
          width={imageDimensions[0]}
          height={imageDimensions[1]}
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x={0}
            y={0}
            width={imageDimensions[0]}
            height={imageDimensions[1]}
            fill="transparent"
          />
          <GridLines />
          {areaData?.rooms?.map((room) => (
            <Room room={room} setIsSomethingDragging={setIsSomethingDragging} />
          ))}
          {lines}
        </svg>
      </PrismaZoom>
    </div>
  );
}

const FormattableTextField = (props) => {
  const textEditor = React.useRef(null);

  return (
    <div style={{ position: "relative" }}>
      <TextField
        multiline
        rows={5}
        label={props.label}
        variant="outlined"
        defaultValue={props.defaultValue}
        onChange={props.onChange}
        style={{ width: "100%", marginBottom: 15 }}
        id={props.id}
        inputRef={textEditor}
      ></TextField>
      <Tooltip title="Format Text">
        <IconButton
          variant="contained"
          onClick={() => {
            textEditor.current.value = wordWrap(textEditor.current.value);
            props.onChange();
          }}
          style={{ position: "absolute", top: 0, right: 0 }}
        >
          <WrapTextIcon
            color="secondary"
            style={{ fontSize: 20 }}
          ></WrapTextIcon>
        </IconButton>
      </Tooltip>
    </div>
  );
};

function ObjectForm(props) {
  const { areaData, editData, dispatch } = React.useContext(AreaEditorContext);
  const objEditData = React.useMemo(() => editData.data, [editData]);

  const updateObject = () => {
    Object.assign(editData.data, objEditData);
    dispatch({ type: "AREA_UPDATED" });
    dispatch({ type: "CLEAR_EDIT" });
  };

  return (
    <EditForm key={Date.now()}>
      <form>
        <IconButton
          variant="contained"
          onClick={() => dispatch({ type: "CLEAR_EDIT" })}
          style={{ float: "right" }}
        >
          <CancelIcon color="secondary"></CancelIcon>
        </IconButton>
        Object #{objEditData.vnum}
        <TextField
          id="obj-name"
          label="Name"
          variant="outlined"
          defaultValue={objEditData?.name}
          style={{ width: "100%", marginBottom: 15 }}
          onChange={(e) => {
            objEditData.name = e.target.value;
          }}
        />
        <TextField
          id="obj-short_description"
          label="Short Description"
          variant="outlined"
          defaultValue={objEditData?.short_description}
          style={{ width: "100%", marginBottom: 15 }}
          onChange={(e) => {
            objEditData.short_description = e.target.value;
          }}
        />
        <TextField
          id="obj-description"
          label="Description"
          variant="outlined"
          defaultValue={objEditData?.description}
          style={{ width: "100%", marginBottom: 15 }}
          onChange={(e) => {
            objEditData.description = e.target.value;
          }}
        />
        <TextField
          multiline
          rows={5}
          label="Builder Notes"
          variant="outlined"
          defaultValue={objEditData.notes}
          onChange={(e) => {
            objEditData.notes = e.target.value;
          }}
          style={{ width: "100%", marginBottom: 15 }}
        />
        <div style={{ textAlign: "left" }}>
          <div style={{ float: "right" }}>
            <Button
              variant="contained"
              color="primary"
              style={{ marginRight: 15 }}
              onClick={updateObject}
            >
              Update
            </Button>
            <Button
              variant="contained"
              onClick={() => dispatch({ type: "CLEAR_EDIT" })}
            >
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </EditForm>
  );
}

function MobForm(props) {
  const { areaData, editData, dispatch } = React.useContext(AreaEditorContext);
  const [mobEditData, setMobEditData] = React.useState(editData.data);

  useEffect(() => {
    setMobEditData(editData.data);
  }, [editData.data]);

  const updateMob = () => {
    Object.assign(editData.data, mobEditData);
    dispatch({ type: "AREA_UPDATED" });
    dispatch({ type: "CLEAR_EDIT" });
  };

  const aiMobDescriptions = () => {
    const mobRepr = JSON.stringify({
      name: mobEditData.name,
      short_description: mobEditData.short_description,
      long_description: mobEditData.long_description,
      description: mobEditData.description,
    });
    fetch(
      awsEndpoint +
        "?area_action=ai-mob&mob=" +
        encodeURIComponent(JSON.stringify(mobRepr)),
      { method: "POST" }
    )
      .then(function (response) {
        return response.json();
      })
      .then((json) => {
        setMobEditData({
          ...mobEditData,
          name: json.name,
          short_description: json.short_description,
          long_description: json.long_description,
          description: wordWrap(json.description),
        });
      });
  };

  return (
    <EditForm key={"mob-" + mobEditData.vnum}>
      <form>
        <IconButton
          variant="contained"
          onClick={() => dispatch({ type: "CLEAR_EDIT" })}
          style={{ float: "right" }}
        >
          <CancelIcon color="secondary"></CancelIcon>
        </IconButton>
        Mob #{mobEditData.vnum}
        <TextField
          id="mob-name"
          label="Name"
          variant="outlined"
          value={mobEditData?.name}
          style={{ width: "100%", marginBottom: 15 }}
          onChange={(e) => {
            setMobEditData({ ...mobEditData, name: e.target.value });
          }}
        />
        <TextField
          id="mob-short_description"
          label="Short Description"
          variant="outlined"
          value={mobEditData?.short_description}
          style={{ width: "100%", marginBottom: 15 }}
          onChange={(e) => {
            setMobEditData({
              ...mobEditData,
              short_description: e.target.value,
            });
          }}
        />
        <TextField
          id="mob-long_description"
          label="Long Description"
          variant="outlined"
          value={mobEditData?.long_description}
          style={{ width: "100%", marginBottom: 15 }}
          onChange={(e) => {
            setMobEditData({
              ...mobEditData,
              long_description: e.target.value,
            });
          }}
        />
        <TextField
          multiline
          rows={5}
          label="Description"
          value={mobEditData.description}
          onChange={(e) => {
            setMobEditData({ ...mobEditData, description: e.target.value });
          }}
          id="mob-description"
          style={{ width: "100%", marginBottom: 15 }}
        />
        <TextField
          multiline
          rows={4}
          label="Builder Notes"
          variant="outlined"
          value={mobEditData.notes}
          onChange={(e) => {
            setMobEditData({ ...mobEditData, notes: e.target.value });
          }}
          style={{ width: "100%", marginBottom: 15 }}
        />
        <div style={{ textAlign: "left", clear: "both" }}>
          <div style={{ float: "right" }}>
            <Button
              variant="contained"
              color="primary"
              style={{ marginRight: 5 }}
              onClick={() => {
                aiMobDescriptions();
              }}
            >
              AI Mob
            </Button>
            <Button
              variant="contained"
              color="primary"
              style={{ marginRight: 15 }}
              onClick={updateMob}
            >
              Update
            </Button>
            <Button
              variant="contained"
              onClick={() => dispatch({ type: "CLEAR_EDIT" })}
            >
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </EditForm>
  );
}

function ExitForm(props) {
  const { areaData, editData, dispatch } = React.useContext(AreaEditorContext);
  const dir = editData.dir;
  const room = editData.room;
  const exitData = editData.data;

  const exitEditData = React.useMemo(
    () => ({ flags: [], to: null, keyword: null, ...exitData }),
    [exitData]
  );

  const acceptAndReciprocate = () => {
    var toRoom = areaData.rooms.find((room) => room.vnum === exitEditData.to);
    if (toRoom === undefined) {
      alert("Unable to find to-room " + exitEditData.to);
    } else {
      Object.assign(exitData, exitEditData);
      room.exits[dir] = { ...exitEditData };
      const rev = dirInfo[dir].rev;
      if (!(rev in toRoom.exits)) {
        toRoom.exits[rev] = { ...exitEditData };
      } else {
        Object.assign(toRoom.exits[rev], exitEditData);
      }
      toRoom.exits[rev].to = room.vnum;
      dispatch({ type: "CLEAR_EDIT" });
    }
    dispatch({ type: "AREA_UPDATED" });
  };

  const deleteExit = () => {
    if (!window.confirm("Delete This Exit?")) {
      return;
    }
    var toRoom = areaData.rooms.find((room) => room.vnum === exitEditData.to);
    if (toRoom !== undefined) {
      const rev = dirInfo[dir].rev;
      delete toRoom.exits[rev];
    }
    delete room.exits[dir];
    dispatch({ type: "AREA_UPDATED" });
    dispatch({ type: "CLEAR_EDIT" });
  };

  return (
    <EditForm key={Date.now()}>
      <form>
        <IconButton
          variant="contained"
          onClick={() => dispatch({ type: "CLEAR_EDIT" })}
          style={{ float: "right" }}
        >
          <CancelIcon color="secondary"></CancelIcon>
        </IconButton>
        <h2>
          #{editData.room.vnum} : {dir}
        </h2>
        <div>
          <TextField
            id="exit-to"
            label="To"
            variant="outlined"
            defaultValue={exitEditData?.to}
            style={{ width: "100%", marginBottom: 15 }}
            onChange={(e) => {
              exitEditData.to = parseInt(e.target.value);
            }}
          />
        </div>
        {exitEditData?.to && (
          <>
            <FormControl component="fieldset">
              <FormGroup>
                {exitFlags.map((flag) => (
                  <FormControlLabel
                    key={"exit-flag-" + flag}
                    control={
                      <Checkbox
                        defaultChecked={exitEditData.flags.includes(flag)}
                        onChange={(e) => {
                          exitEditData.flags = e.target.checked
                            ? exitEditData.flags.concat([e.target.name])
                            : exitEditData.flags.filter(
                                (i) => i !== e.target.name
                              );
                        }}
                        name={flag}
                      />
                    }
                    label={flag}
                  />
                ))}
              </FormGroup>
            </FormControl>
            <TextField
              id="exit-keyword"
              label="Keyword"
              variant="outlined"
              defaultValue={exitEditData?.keyword}
              style={{ width: "100%", marginBottom: 15 }}
              onChange={(e) => {
                exitEditData.keyword = e.target.value;
              }}
            />
            <TextField
              id="exit-key"
              label="Key"
              variant="outlined"
              defaultValue={exitEditData?.key}
              style={{ width: "100%", marginBottom: 15 }}
              onChange={(e) => {
                exitEditData.key = parseInt(e.target.value);
              }}
            />
            <div style={{ textAlign: "left" }}>
              <Button
                variant="contained"
                color="secondary"
                style={{ marginRight: 15 }}
                onClick={deleteExit}
              >
                Delete
              </Button>
              <div style={{ float: "right" }}>
                <Button
                  variant="contained"
                  color="primary"
                  style={{ marginRight: 15 }}
                  onClick={acceptAndReciprocate}
                >
                  Update
                </Button>
                <Button
                  variant="contained"
                  onClick={() => dispatch({ type: "CLEAR_EDIT" })}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </>
        )}
      </form>
    </EditForm>
  );
}

function RoomForm(props) {
  const { areaData, editData, dispatch } = React.useContext(AreaEditorContext);
  const [updateEnabled, setUpdateEnabled] = React.useState(false);
  const [tab, setTab] = React.useState(0);
  const [roomEditData, setRoomEditData] = React.useState({ ...editData.data });

  React.useEffect(() => {
    setRoomEditData({ ...editData.data });
    setUpdateEnabled(false);
  }, [editData.data]);

  const resetName = (reset) => {
    if (reset.type === "mob") {
      const mob = areaData.mobs.find((mob) => reset.vnum === mob.vnum);
      if (mob) {
        return mob.short_description + " (mob #" + reset.vnum + ")";
      } else {
        return "mob #" + reset.vnum;
      }
    } else if (reset.type === "object") {
      const obj = areaData.objects.find((obj) => reset.vnum === obj.vnum);
      if (obj) {
        return obj.short_description + " (obj #" + reset.vnum + ")";
      } else {
        return "object #" + reset.vnum;
      }
    }
  };

  const renderNode = (node) => (
    <li>
      {resetName(node)}
      {node?.objects ? <ul>{node.objects.map(renderNode)}</ul> : null}
    </li>
  );

  const aiRoomDescriptions = () => {
    const roomRepr = JSON.stringify({
      name: roomEditData.name,
      description: roomEditData.description,
      sector: roomEditData.sector,
      exits: Object.entries(roomEditData.exits).forEach(([dir, exit]) => [
        dir,
        areaData.rooms.filter((room) => room.vnum === exit.to)[0].name,
      ]),
    });
    fetch(
      awsEndpoint +
        "?area_action=ai-room&room=" +
        encodeURIComponent(JSON.stringify(roomRepr)),
      { method: "POST" }
    )
      .then(function (response) {
        return response.json();
      })
      .then((json) => {
        setRoomEditData({
          ...roomEditData,
          description: wordWrap(json.description),
          name: json.name,
        });
        setUpdateEnabled(true);
      });
  };

  return (
    <EditForm key={"room-" + roomEditData.vnum}>
      <IconButton
        variant="contained"
        onClick={() => dispatch({ type: "CLEAR_EDIT" })}
        style={{ float: "right" }}
      >
        <CancelIcon color="secondary"></CancelIcon>
      </IconButton>
      <Tabs
        value={tab}
        onChange={(e, val) => setTab(val)}
        textColor="secondary"
        indicatorColor="secondary"
      >
        <Tab label="Room Data" id="room-edit-tab-0" />
        <Tab label="Resets" id="room-edit-tab-1" />
      </Tabs>
      <TabPanel style={{ display: tab === 1 ? "block" : "none" }}>
        <ul>
          {roomEditData?.resets ? roomEditData.resets.map(renderNode) : null}
        </ul>
      </TabPanel>
      <TabPanel style={{ display: tab === 0 ? "block" : "none" }}>
        <form>
          <h2 style={{ margin: 15, padding: 0 }}>Room #{roomEditData.vnum}</h2>
          <TextField
            label="Name"
            variant="outlined"
            value={roomEditData.name}
            style={{ width: "100%", marginBottom: 15 }}
            onChange={(e) => {
              setRoomEditData({ ...roomEditData, name: e.target.value });
              setUpdateEnabled(true);
            }}
          />
          <TextField
            multiline
            rows={5}
            variant="outlined"
            label="Description"
            value={roomEditData.description}
            onChange={(e) => {
              setRoomEditData({ ...roomEditData, description: e.target.value });
              setUpdateEnabled(true);
            }}
            style={{ width: "100%", marginBottom: 15 }}
          />
          <TextField
            multiline
            rows={4}
            variant="outlined"
            label="Builder Notes"
            value={roomEditData.notes}
            onChange={(e) => {
              setRoomEditData({ ...roomEditData, notes: e.target.value });
              setUpdateEnabled(true);
            }}
            style={{ width: "100%", marginBottom: 15 }}
          />
          <FormControl style={{ width: "100%", marginBottom: 15 }}>
            <InputLabel id="room-sector">Sector</InputLabel>
            <Select
              labelId="Room Sector"
              id="room-selector"
              value={roomEditData.sector}
              onChange={(e) => {
                setRoomEditData({ ...roomEditData, sector: e.target.value });
                setUpdateEnabled(true);
              }}
            >
              {Object.keys(sectors).map((sector) => (
                <MenuItem value={sector} key={"sector-" + sector}>
                  {sector}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            id="room-heal_rate"
            label="Heal Rate"
            variant="outlined"
            value={roomEditData.heal_rate}
            style={{ width: "100%", marginBottom: 15, marginTop: 15 }}
            onChange={(e) => {
              setRoomEditData({ ...roomEditData, heal_rate: e.target.value });
              setUpdateEnabled(true);
            }}
          />
          <TextField
            id="room-mana_rate"
            label="Mana Rate"
            variant="outlined"
            value={roomEditData.mana_rate}
            style={{ width: "100%", marginBottom: 15 }}
            onChange={(e) => {
              setRoomEditData({ ...roomEditData, mana_rate: e.target.value });
              setUpdateEnabled(true);
            }}
          />
          <div style={{ marginTop: 10 }}>
            <div style={{ float: "right" }}>
              <Button
                variant="contained"
                style={{ marginRight: 5 }}
                onClick={() => dispatch({ type: "CLEAR_EDIT" })}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="primary"
                style={{ marginRight: 5 }}
                onClick={() => {
                  aiRoomDescriptions();
                }}
              >
                AI Room
              </Button>
              <Button
                disabled={!updateEnabled}
                variant="contained"
                color="primary"
                style={{ marginRight: 5 }}
                onClick={() => {
                  Object.assign(editData.data, roomEditData);
                  dispatch({ type: "AREA_UPDATED" });
                  dispatch({ type: "CLEAR_EDIT" });
                }}
              >
                Update
              </Button>
            </div>
          </div>
        </form>
      </TabPanel>
    </EditForm>
  );
}

const AreaEdit = (props) => {
  const { areaData, dispatch } = React.useContext(AreaEditorContext);
  const [updateEnabled, setUpdateEnabled] = React.useState(false);
  const areaEditData = { ...areaData };

  React.useEffect(() => {
    setUpdateEnabled(false);
  }, [areaData]);

  return (
    areaData?.rooms !== undefined && (
      <form key={areaData.name} style={{ padding: 30 }}>
        <div>
          <TextField
            disabled={true}
            id="area-name"
            label="Area Name"
            variant="outlined"
            defaultValue={areaEditData.name}
            style={{ width: 400, marginBottom: 15 }}
            onChange={(e) => {
              areaEditData.name = e.target.value;
              setUpdateEnabled(true);
            }}
          />
        </div>
        <div>
          <TextField
            disabled={true}
            id="area-name"
            label="Builders"
            variant="outlined"
            defaultValue={areaEditData.builders}
            style={{ width: 400, marginBottom: 15 }}
            onChange={(e) => {
              areaEditData.builders = e.target.value;
              setUpdateEnabled(true);
            }}
          />
        </div>
        <div>
          <TextField
            disabled={true}
            id="area-name"
            label="Credits"
            variant="outlined"
            defaultValue={areaEditData.credits}
            style={{ width: 400, marginBottom: 15 }}
            onChange={(e) => {
              areaEditData.credits = e.target.value;
              setUpdateEnabled(true);
            }}
          />
        </div>
        <div>
          <TextField
            disabled={true}
            id="area-name"
            label="Lower Vnum"
            variant="outlined"
            value={areaEditData.lower_vnum}
            style={{ width: 400, marginBottom: 15 }}
          />
        </div>
        <div>
          <TextField
            disabled={true}
            id="area-name"
            label="Upper Vnum"
            variant="outlined"
            value={areaEditData.upper_vnum}
            style={{ width: 400, marginBottom: 15 }}
          />
        </div>
        <div>
          <TextField
            multiline
            rows={5}
            disabled={true}
            id="area-notes"
            label="Builder Notes"
            variant="outlined"
            defaultValue={areaEditData.notes}
            style={{ width: 400, marginBottom: 15 }}
            onChange={(e) => {
              areaEditData.notes = e.target.value;
              setUpdateEnabled(true);
            }}
          />
        </div>
        <div style={{ width: 400, textAlign: "right" }}></div>
      </form>
    )
  );
};

const AreaList = (props) => {
  const [areaList, setAreaList] = React.useState([]);

  useEffect(() => {
    if (props.open) {
      fetch("http://localhost:4001/builderweb/api/areas", {
        method: "GET",
        headers: getAuthHeaders(),
      })
        .then(function (response) {
          return response.json();
        })
        .then((json) => {
          setAreaList(json);
        });
    }
  }, [props.open]);

  return (
    <Menu
      anchorEl={props.anchorEl}
      open={props.open}
      onClose={() => props.setOpen(false)}
    >
      {areaList.map((area) => (
        <MenuItem onClick={() => props.setArea(area.vnum)}>
          {area.name}
        </MenuItem>
      ))}
    </Menu>
  );
};

const App = () => {
  const [{ areaData, editData, areaVnum }, dispatch] = React.useReducer(
    areaDataReducer,
    {
      areaData: {},
      editData: {},
      areaVnum: null,
    }
  );
  const [fileName, setFileName] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState(0);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const fileMenuAnchor = React.useRef(null);

  useEffect(() => {
    if (areaVnum) {
      const headers = new Headers();
      headers.set("Authorization", "Basic " + btoa("palrich" + ":" + ""));
      fetch(`http://localhost:4001/builderweb/api/areas/${areaVnum}`, {
        method: "GET",
        headers: headers,
      })
        .then(function (response) {
          return response.json();
        })
        .then((json) => {
          initialPos(json.rooms);
          dispatch({ type: "SET_AREA", payload: json });
        });
    }
  }, [areaVnum]);

  return (
    <AreaEditorContext.Provider
      value={{ areaData: areaData, editData: editData, dispatch: dispatch }}
    >
      <div style={{ float: "right", padding: 8 }}>
        <Tooltip title="Area Files">
          <IconButton
            ref={fileMenuAnchor}
            variant="contained"
            disabled={false}
            onClick={() => setMenuOpen(true)}
          >
            <WbCloudyIcon color={"secondary"} />
          </IconButton>
        </Tooltip>
        <AreaList
          open={menuOpen}
          setOpen={setMenuOpen}
          anchorEl={fileMenuAnchor.current}
          setArea={(areaVnum) =>
            dispatch({ type: "SET_AREA_VNUM", payload: areaVnum })
          }
        />
      </div>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
        >
          <Tab label="Area" id="simple-tab-0" />
          <Tab label="Rooms" id="simple-tab-1" />
          <Tab label="Mobs" id="simple-tab-2" />
          <Tab label="Objects" id="simple-tab-3" />
        </Tabs>
      </Box>
      <div
        style={{ position: "absolute", left: 0, top: 58, bottom: 0, right: 0 }}
      >
        <TabPanel value={activeTab} index={0}>
          <AreaEdit />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          {areaData?.rooms && <AreaEditor />}
          <div
            style={{ position: "absolute", left: 10, top: 0, color: "black" }}
          >
            {areaData?.name} - {fileName}
          </div>
        </TabPanel>

        <TabPanel value={activeTab} index={2} style={{ paddingLeft: 15 }}>
          <TableContainer>
            <Table style={{ width: 800 }}>
              <TableHead>
                <TableRow>
                  <StyledTableCell>Vnum</StyledTableCell>
                  <StyledTableCell>Name</StyledTableCell>
                  <StyledTableCell align="right">Level</StyledTableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {areaData?.mobs &&
                  areaData.mobs.map((mob) => (
                    <StyledTableRow
                      key={"mob-card-" + mob.vnum}
                      onClick={() =>
                        dispatch({
                          type: "EDIT",
                          payload: { mode: "mob", data: mob },
                        })
                      }
                    >
                      <StyledTableCell component="th" scope="row">
                        {mob.vnum}
                      </StyledTableCell>
                      <StyledTableCell component="th" scope="row">
                        {mob.short_description}
                      </StyledTableCell>
                      <StyledTableCell align="right">
                        {mob.level}
                      </StyledTableCell>
                    </StyledTableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={activeTab} index={3} style={{ paddingLeft: 15 }}>
          <TableContainer>
            <Table style={{ width: 800 }}>
              <TableHead>
                <TableRow>
                  <StyledTableCell>Vnum</StyledTableCell>
                  <StyledTableCell>Name</StyledTableCell>
                  <StyledTableCell align="right">Level</StyledTableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {areaData?.objects &&
                  areaData.objects.map((object) => (
                    <StyledTableRow
                      key={"object-card-" + object.vnum}
                      onClick={() =>
                        dispatch({
                          type: "EDIT",
                          payload: { mode: "obj", data: object },
                        })
                      }
                    >
                      <StyledTableCell component="th" scope="row">
                        {object.vnum}
                      </StyledTableCell>
                      <StyledTableCell component="th" scope="row">
                        {object.short_description}
                      </StyledTableCell>
                      <StyledTableCell align="right">
                        {object.level}
                      </StyledTableCell>
                    </StyledTableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </div>
      {editData?.mode === "room" && <RoomForm />}
      {editData?.mode === "exit" && <ExitForm />}
      {editData?.mode === "mob" && <MobForm />}
      {editData?.mode === "obj" && <ObjectForm />}
    </AreaEditorContext.Provider>
  );
};

export default App;
