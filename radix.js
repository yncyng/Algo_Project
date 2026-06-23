/**
 * Converts an IPv4 address string to an unsigned 32-bit integer.
 * Example: '192.168.1.100' -> 3232235876
 */
function ipToInt(ip) {
    const octets = ip.split('.');
    
    // Bitwise shift each octet into position
    const result = (
        (parseInt(octets[0], 10) << 24) |
        (parseInt(octets[1], 10) << 16) |
        (parseInt(octets[2], 10) << 8) |
        parseInt(octets[3], 10)
    );
    
    // The >>> 0 forces JavaScript to treat it as an unsigned integer,
    // preventing IPs with high first octets from returning negative numbers.
    return result >>> 0;
}

// Quick test to verify it works
console.log("Testing DDoS IP 192.168.1.100:", ipToInt("192.168.1.100"));