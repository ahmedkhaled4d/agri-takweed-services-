import { PipelineStage } from "mongoose";

export const searchRequestsAgg = ({
  filter,
  skip,
  limit
}: {
  filter: Record<string, unknown>;
  skip: number;
  limit: number;
}): Array<PipelineStage> => [
  {
    $match: filter
  },
  {
    $lookup: {
      from: "locations",
      localField: "farm.location.governorate",
      foreignField: "_id",
      as: "governorate"
    }
  },
  {
    $lookup: {
      from: "locations",
      localField: "farm.location.center",
      foreignField: "_id",
      as: "center"
    }
  },

  {
    $lookup: {
      from: "crops",
      localField: "crop",
      foreignField: "_id",
      as: "cropDetails"
    }
  },
  { $unwind: "$governorate" },
  { $unwind: "$center" },
  { $unwind: "$cropDetails" },
  {
    $project: {
      "farm.location": 0,
      crop: 0,
      user: 0,
      createdBy: 0,
      "cropDetails.varieties": 0,
      "cropDetails.code": 0,
      "cropDetails.active": 0,
      "cropDetails._id": 0,
      "governorate.type": 0,
      "governorate.parent": 0,
      "governorate.coordinates": 0,
      "center.type": 0,
      "center.parent": 0,
      "center.coordinates": 0
    }
  },
  {
    $sort: {
      createdAt: -1
    }
  },
  {
    $limit: limit
  },
  {
    $skip: skip
  }
];

export const verifyCertificateIntersectionAgg = (
  code: string
): Array<PipelineStage> => [
  {
    $project: {
      code: "$polygons.code",
      intersections: "$polygons.intersections",
      originalPiece: "$polygons.point",
      farmName: "$polygons.farmName"
    }
  },
  {
    $unwind: {
      path: "$intersections"
    }
  },
  {
    $project: {
      "intersections.originalPiece": "$originalPiece",
      "intersections.landIntersectsWith": "$intersections.landIntersectsWith",
      "intersections.areaOfIntersection": "$intersections.areaOfIntersection",
      "intersections.pieceIntersected": "$intersections.pieceIntersected",
      "intersections.intersectionCoords": "$intersections.intersectionCoords",
      code: 1,
      farmName: 1
    }
  },
  {
    $lookup: {
      from: "requests",
      localField: "code",
      foreignField: "code",
      as: "originalLand"
    }
  },
  {
    $unwind: {
      path: "$originalLand"
    }
  },
  {
    $lookup: {
      from: "requests",
      localField: "intersections.landIntersectsWith",
      foreignField: "code",
      as: "intersectedLand"
    }
  },
  {
    $unwind: {
      path: "$intersectedLand"
    }
  },
  {
    $addFields: {
      originalCrop: "$originalLand.crop",
      intersectedCrop: "$intersectedLand.crop",
      originalSeason: {
        $year: "$originalLand.gpxTimestamp"
      },
      intersectedSeason: {
        $year: "$intersectedLand.gpxTimestamp"
      },
      intersectedFarmName: "$intersectedLand.farm.name"
    }
  },
  {
    $redact: {
      $cond: [
        {
          $eq: ["$originalCrop", "$intersectedCrop"]
        },
        "$$KEEP",
        "$$PRUNE"
      ]
    }
  },
  {
    $redact: {
      $cond: [
        {
          $eq: ["$originalSeason", "$intersectedSeason"]
        },
        "$$KEEP",
        "$$PRUNE"
      ]
    }
  },
  {
    $project: {
      "intersections.farmName": "$intersectedFarmName",
      "intersections.areaOfIntersection": "$intersections.areaOfIntersection",
      "intersections.originalPiece": "$intersections.originalPiece",
      "intersections.landIntersectsWith": "$intersections.landIntersectsWith",
      "intersections.intersectionCoords": "$intersections.intersectionCoords",
      "intersections.pieceIntersected": "$intersections.pieceIntersected",
      code: 1,
      originalLand: 1,
      intersectedLand: 1,
      originalCrop: 1,
      originalSeason: 1,
      intersectedCrop: 1,
      intersectedSeason: 1,
      farmName: 1
    }
  },
  {
    $group: {
      _id: {
        originalCode: "$code",
        originalPiece: "$originalPiece",
        originalLand: "$originalLand"
      },
      lands: {
        $addToSet: "$intersectedLand"
      },
      intersectionsData: {
        $addToSet: "$intersections"
      },
      original: {
        $addToSet: "$originalLand"
      }
    }
  },
  {
    $project: {
      originalLand: "$_id.originalLand",
      code: "$_id.originalCode",
      intersections: "$_id.intersections",
      lands: 1,
      intersectionsData: 1,
      original: 1
    }
  },
  {
    $project: {
      lands: {
        $concatArrays: ["$original", "$lands"]
      },
      intersectionsData: 1,
      code: 1
    }
  },
  {
    $match: {
      code: code
    }
  }
];
