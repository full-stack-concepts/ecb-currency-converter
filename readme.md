# ECB Currency Convertor Demo-app


Converts currencies supported by the European Central Bank. Updates hourly. 
More Info: [ECB Reference Rates](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html)


## Usage/API

http://:host:port/api/convert/:currency/:foreign_currency/:amount

### Examples

**euro to usd**

```bash
http://localhost:3000/api/convert/eur/usd/10.2
````

**response**
```bash
base_currency	"EUR"
target_currency	"USD"
amount	10.2
raw	11.77896
result	11.78
ts	1538647987715
rates	
eur->usd	1.1548
usd->eur	0.8659508139937652
````

**usd to eur**

```bash
http://localhost:3000/api/convert/eur/usd/10.2
````

**response**
```bash
base_currency	"USD"
target_currency	"EUR"
amount	10.2
raw	8.832698302736404
result	8.83
ts	1538648065233
rates	
usd->eur	0.8659508139937652
eur->usd	1.1548
````



### Development

```bash
nom install
npm run build
npm run watch
```
### Production

```bash
nom install
npm run build
npm run serve
```
### Running tests

```bash
npm test
```

### Linting

```bash
npm run tslint
```

### Building a container

```bash
docker build .
```
