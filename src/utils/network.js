import dgram from 'dgram';

export async function getLocalIPv4() {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4');
    socket.connect(80, '8.8.8.8', () => {
      const address = socket.address();
      socket.close();
      resolve(address.address);
    });
    socket.on('error', (err) => {
      socket.close();
      reject(err);
    });
  });
}