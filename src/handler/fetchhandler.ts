import { JSDOM, VirtualConsole } from "jsdom";
import fetch from "node-fetch";
import { getAverageColor } from "fast-average-color-node";
import { ColorResolvable } from "discord.js";
import { createAudioResource, demuxProbe } from "@discordjs/voice";
import { Readable } from "stream";

import DatabaseHandler from "./databasehandler";

const europeanURL = "https://radiomap.eu";
const worldURL = "https://worldradiomap.com";

const virtualConsole = new VirtualConsole();
virtualConsole.on("error", () => {});

type stationLocation = { name: string; image?: string; url: string };
type stationData = {
  station_name: string;
  station_id: number;
  image_url: string;
  audio_url: string;
};
type fetchedData = {
  region_name: string;
  region_id: number;
  region_image?: string;
  stations: stationData[];
};

async function getFlagColorAverage(isoCode: string) {
  try {
    const prepIsoCode = isoCode.split("/")[0].toLowerCase();
    const url = `https://worldradiomap.com/2013/flags/46/${prepIsoCode}.png`;
    const avgColor = await getAverageColor(url);
    return avgColor.hex;
  } catch (err) {
    return undefined;
  }
}

let countryIds: number[] = [];
async function fetchData(
  countryName: string,
  isoCode: string,
  isEuropean: boolean,
  skipExisting: boolean,
  progressCallback: (
    countryId: number,
    percentage: number,
    time_seconds: number,
    current_region?: string,
    current_dataset?: fetchedData[],
    flag_color_average?: ColorResolvable,
  ) => any,
): Promise<fetchedData[] | undefined> {
  let countryId: number = 1;

  try {
    const regions = isEuropean
      ? await fetchEuropeanRegions(countryName, isoCode)
      : await fetchWorldRegions(countryName, isoCode);
    if (!regions) return undefined;

    let databaseData: fetchedData[] = [];
    const result: fetchedData[] = [];

    const allDocs = await DatabaseHandler.StationsData.find({})
      .select("-_id -__v")
      .exec();
    const currentCountry = allDocs.find(
      (element) => element.country === countryName && element.country_id,
    );
    if (!currentCountry) {
      const savedCountriesIds = allDocs.map((element) => element.country_id);

      for (let i = 0; i <= countryIds.length + savedCountriesIds.length; i++) {
        if (!countryIds.includes(i + 1) && !savedCountriesIds.includes(i + 1)) {
          countryId = i + 1;
          break;
        }
      }

      countryIds.push(countryId);
    } else {
      countryId = <number>currentCountry.country_id;
    }

    const doc = allDocs.filter((element) => element.country === countryName)[0];
    if (doc && doc.regions) {
      doc.regions.forEach((element: any) => {
        const stations: stationData[] = element.stations;
        databaseData.push(<fetchedData>{
          region_name: element.region_name,
          region_id: element.region_id,
          region_image: element.region_image,
          stations: stations,
        });
      });
    }

    const flagColorAverage = <ColorResolvable>(
      await getFlagColorAverage(isoCode)
    );

    if (regions.length <= 0) {
      const splitIsoCode = isoCode.split("/");
      const prepIsoCode = splitIsoCode[0];
      const regionName = splitIsoCode[1];
      const regionImage = await fetchRegionImage(
        countryName,
        regionName.toLowerCase(),
      );

      if (
        skipExisting &&
        databaseData.find((element) => element.region_name === regionName)
      ) {
        await progressCallback(
          countryId,
          100,
          0,
          regionName,
          undefined,
          flagColorAverage,
        );
        countryIds.splice(countryIds.lastIndexOf(countryId), 1);
        return databaseData;
      }
      if (splitIsoCode.length <= 1) {
        countryIds.splice(countryIds.lastIndexOf(countryId), 1);
        return undefined;
      }

      await progressCallback(
        countryId,
        0,
        NaN,
        regionName,
        undefined,
        flagColorAverage,
      );

      const stationsArray: stationData[] | undefined =
        await fetchStationsOfRegion(prepIsoCode, regionName, isEuropean);
      if (!stationsArray || stationsArray.length === 0) {
        countryIds.splice(countryIds.lastIndexOf(countryId), 1);
        return undefined;
      }

      result.push({
        region_name: regionName,
        region_id: 1,
        region_image: regionImage,
        stations: stationsArray,
      });
      await progressCallback(
        countryId,
        100,
        0,
        undefined,
        undefined,
        flagColorAverage,
      );
      countryIds.splice(countryIds.lastIndexOf(countryId), 1);

      return result;
    }

    //const defaultEstimatedTime = ((skipExisting ? regions.length - result.length : regions.length) * 55 * 4.5);
    await progressCallback(
      countryId,
      0,
      NaN,
      regions[0].name.replaceAll(":", ", "),
      undefined,
      flagColorAverage,
    );

    let totalTime = 0;
    let skipped = 0;
    for (let i = 0; i < regions.length; i++) {
      if (
        skipExisting &&
        databaseData.find((element) => element.region_name === regions[i].name)
      ) {
        skipped++;
        const percentage = (((i + 1) / (regions.length + 1)) * 100).toFixed(2);
        const estimatedTime =
          (totalTime / (i + 1 - skipped)) *
          (regions.length - (i + 1 - skipped));
        const nextRegion =
          i + 1 > regions.length - 1 ? regions.length - 1 : i + 1;
        result.push({
          region_name: databaseData[i].region_name,
          region_id: databaseData[i].region_id,
          region_image: databaseData[i].region_image,
          stations: databaseData[i].stations,
        });
        await progressCallback(
          countryId,
          Number(percentage),
          Number(estimatedTime),
          regions[nextRegion].name,
          result,
          flagColorAverage,
        );
        continue;
      }

      let start = Date.now();
      const stationsArray: stationData[] | undefined =
        await fetchStationsOfRegion(isoCode, regions[i].url, isEuropean);
      let end = Date.now();
      if (!stationsArray || stationsArray.length === 0) {
        skipped++;
        const percentage = (((i + 1) / (regions.length + 1)) * 100).toFixed(2);
        const estimatedTime =
          (totalTime / (i + 1 - skipped)) *
          (regions.length - (i + 1 - skipped));
        const nextRegion =
          i + 1 > regions.length - 1 ? regions.length - 1 : i + 1;
        await progressCallback(
          countryId,
          Number(percentage),
          Number(estimatedTime),
          regions[nextRegion].name.replaceAll(":", ", "),
          result,
          flagColorAverage,
        );
        continue;
      }

      result.push({
        region_name: regions[i].name,
        region_id: i + 1,
        region_image: regions[i].image,
        stations: stationsArray,
      });

      totalTime += (end - start) / 1000;
      const percentage = (((i + 1) / (regions.length + 1)) * 100).toFixed(2);
      const estimatedTime =
        (totalTime / (i + 1 - skipped)) * (regions.length - (i + 1 - skipped));
      const nextRegion =
        i + 1 > regions.length - 1 ? regions.length - 1 : i + 1;
      await progressCallback(
        countryId,
        Number(percentage),
        Number(estimatedTime),
        regions[nextRegion].name.replaceAll(":", ", "),
        result,
        flagColorAverage,
      );
    }

    countryIds.splice(countryIds.lastIndexOf(countryId), 1);
    return result;
  } catch {
    countryIds.splice(countryIds.lastIndexOf(countryId), 1);
    return undefined;
  }
}

async function fetchEuropeanRegions(
  countryName: string,
  isoCode: string,
): Promise<stationLocation[] | undefined> {
  try {
    const data = await fetch(europeanURL + "/" + isoCode.toLowerCase(), {
      timeout: 5000,
    });
    const dataText = await data.text();

    const dom = new JSDOM(dataText, { virtualConsole });
    const elements = dom.window.document.querySelectorAll(".title > a");

    const stationLocations: stationLocation[] = [];
    for (let i = 0; i < elements.length; i++) {
      const item = elements.item(i);
      const href = (<HTMLAnchorElement>item).href;
      let regionURL = href;

      if (regionURL.startsWith("https") || regionURL.startsWith("www"))
        continue;
      if (regionURL.startsWith("../") || regionURL.startsWith("/" + isoCode)) {
        const splitRegionURL = regionURL.split("/");
        if (splitRegionURL[1] !== isoCode) continue;
        regionURL = splitRegionURL[2];
      }

      const name = regionURL.split(".")[0];
      const image = await fetchRegionImage(countryName, name.toLowerCase());

      stationLocations.push({ name: name, image: image, url: regionURL });
    }

    return stationLocations;
  } catch {
    return undefined;
  }
}
async function fetchWorldRegions(
  countryName: string,
  isoCode: string,
): Promise<stationLocation[] | undefined> {
  try {
    const data = await fetch(worldURL + "/" + isoCode.toLowerCase(), {
      timeout: 5000,
    });
    const dataText = await data.text();

    const dom = new JSDOM(dataText, { virtualConsole });
    const elements = dom.window.document.querySelectorAll(".title > a");

    const stationLocations: stationLocation[] = [];
    for (let i = 0; i < elements.length; i++) {
      const item = elements.item(i);
      const href = (<HTMLAnchorElement>item).href;
      let regionURL = href.substring(href.indexOf("/"));

      //stateName = querySelect("span");
      let name = "?";
      let image: string | undefined = undefined;
      if ((regionURL.match(/\//g) || [])?.length >= 2) {
        const stateCode = regionURL.split("/")[1];
        if (!stateCode.startsWith("us")) continue;
        const city = regionURL.split("/")[2].split(".")[0];
        image = await fetchRegionImage(countryName, city.toLowerCase());

        name = stateCode.split("-")[1];
        name += ":" + city;
      } else {
        name = regionURL.split(".")[0];
        image = await fetchRegionImage(countryName, name.toLowerCase());
      }

      stationLocations.push({ name: name, image: image, url: regionURL });
    }

    return stationLocations;
  } catch {
    return undefined;
  }
}

async function fetchStationsOfRegion(
  isoString: string,
  regionURL: string,
  isEuropean: boolean,
): Promise<stationData[] | undefined> {
  try {
    const isUSA = isoString === "us";
    const headURL = isEuropean ? europeanURL : worldURL;
    const baseURL =
      headURL +
      (!isUSA ? "/" + isoString + (isoString !== "" ? "/" : "") : "") +
      regionURL.split(".")[0];

    const data = await fetch(baseURL, { timeout: 5000 });
    const dataText = await data.text();

    const dom = new JSDOM(dataText, { virtualConsole });
    const elements1 = dom.window.document.getElementsByClassName("rt0");
    const elements2 = dom.window.document.getElementsByClassName("rt1");

    const stations: stationData[] = [];

    let stationId = 0;
    for (let i = 0; i < elements1.length + elements2.length; i++) {
      const query = (
        i + 1 <= elements1.length ? elements1.item(i) : elements2.item(i)
      )?.querySelector("a");
      const title = query?.textContent?.trim();
      const imageURL = (headURL + query?.querySelector("img")?.src).replaceAll(
        "../" + isoString,
        "/" + isoString,
      );

      const href = query?.href;

      if (!href || href.startsWith("www") || href.startsWith("http")) continue;
      if (stations.find((element) => element.station_name === title)) continue;

      const audioPlayerLink =
        (isEuropean ? europeanURL + "/" : worldURL + "/") +
        href.substring(href.indexOf("/") + 1);

      const audioLink = await fetchAudioLink(audioPlayerLink);
      if (!audioLink) continue;

      stationId++;
      stations.push({
        station_name: title || "?",
        station_id: stationId,
        image_url: imageURL,
        audio_url: audioLink,
      });
    }

    return stations;
  } catch (err) {
    return undefined;
  }
}

async function fetchAudioLink(
  audioPlayerLink: string,
): Promise<string | undefined> {
  try {
    const data = await fetch(audioPlayerLink, { timeout: 5000 });
    const dataText = await data.text();

    const dom = new JSDOM(dataText, { virtualConsole });
    const result = dom.window.document.querySelector("audio")?.src;

    if (!result) return undefined;

    const audioStream = createAudioResource(result).playStream;
    const probe = await demuxProbe(new Readable().wrap(audioStream), 1);
    audioStream.destroy();

    if (probe.stream.readableLength <= 0) {
      probe.stream.destroy();
      return undefined;
    }

    probe.stream.destroy();
    return result;
  } catch {
    return undefined;
  }
}

async function fetchRegionImage(
  countryName: string,
  regionName: string,
): Promise<string | undefined> {
  try {
    const searchedRegion = await fetch(
      "https://api.teleport.org/api/cities/?search=" + regionName,
      { timeout: 3000 },
    );
    const searchedRegionData = await searchedRegion.json();
    if (!searchedRegionData) return undefined;

    const data = searchedRegionData._embedded["city:search-results"].find(
      (element: any) => {
        const split = element.matching_full_name.split(",");
        const apiCountryName = split[split.length - 1].trim();

        return apiCountryName.toLowerCase() === countryName.toLowerCase();
      },
    );

    const geoNameURL = data._links["city:item"].href;
    const geoName = await fetch(geoNameURL, { timeout: 3000 });
    const geoNameData = await geoName.json();

    const urbanAreas = geoNameData._links["city:urban_area"];
    if (!urbanAreas) return undefined;

    const images = urbanAreas.href + "images";

    const fetchedImages = await fetch(images, { timeout: 3000 });
    const imagesData = await fetchedImages.json();

    return imagesData.photos[0].image.mobile; //alt: instead of .mobile you can to .web
  } catch {
    return undefined;
  }
}

export default {
  fetchData: fetchData,
};
