let rows = [];

for (let i = 0; i < 50; i++) {
	let row = [];
	for (let k = i * 50; k < (i * 50) + 50; k++) {
		row.push(k)
	}

	rows.push(row)
}

console.log(rows);
