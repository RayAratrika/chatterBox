const app = require('express')();
const http = require('http').createServer(app);
const socket = require('socket.io').listen(http);
const url = require('url');

var users = {}, rooms = [], clients = [];

function getUsers(io, query) {
    io.client.id = query.name; io.room = query.roomID; userNotInRoom = true;
    if (!clients.includes(io.client.id)) clients.push(io.client.id);
    if (!rooms.includes(io.room)) {
        rooms.push(io.room);
        users[io.room] = [];
    }
    for (var i = 0; i < users[io.room].length; i++) {
        if (users[io.room][i] === io.client.id) {
            userNotInRoom = false;
            break;
        }
    }
    if (userNotInRoom && clients.includes(io.client.id)) users[io.room].push(io.client.id);

    return users;
}

app.get(('/chatterBox'), (req, res) => {
    const { query } = url.parse(req.url, true);

    //check if both fields are set
    if (query.name !== undefined && query.roomID !== undefined
        && query.name !== '' && query.roomID !== '') res.sendFile(__dirname + '/index.html');
    else res.sendFile(__dirname + '/login.html');

    //user joining
    socket.once('connection', (io) => {

        //all the people in a room.
        getUsers(io, query);

        io.join(query.roomID, () => {

            var chatters = users[query.roomID];

            //user joining chat room.
            io.to(query.roomID).emit('userJoin', query.name, chatters);

            //users in the room info.
            io.on('getChatters', () => {
                console.log('getChatters - users in chat: ' + chatters)
                socket.to(query.roomID).emit('chatters', chatters)
            });

            //on user typing
            io.on('typing', () => socket.to(query.roomID).emit('typing', query.name));

            //user sending message(s).
            io.on('chat message', (msg) =>
                socket.to(query.roomID).emit('chat message', msg, query.name)
            );

            //user leaving chat room.
            io.once('disconnect', () => {
                for(var i = 0; i < users[query.roomID].length; i++){
                    if(users[query.roomID][i] === query.name) chatters.splice(i,1);
                }
                console.log('disconnect - users in chat: ' + chatters);
                socket.to(query.roomID).emit('disconnect', query.name, chatters).emit('chatters', chatters);
            });
        });

    })
})

http.listen(8080, '127.0.0.1', console.log('Listening on port 127.0.0.1:8080'));
